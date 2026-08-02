package handler

import (
	"bufio"
	_ "embed"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type localAIModelsResponse struct {
	Assistants []localAIModelsAssistant `json:"assistants"`
}

type localAIModelsAssistant struct {
	Value  string         `json:"value"`
	Models []localAIModel `json:"models"`
}

type localAIModel struct {
	ID              string                  `json:"id"`
	Name            string                  `json:"name"`
	Description     string                  `json:"description"`
	ReasoningLevels []localAIReasoningLevel `json:"reasoning_levels,omitempty"`
}

type localAIReasoningLevel struct {
	Value       string `json:"value"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

//go:embed claude_model_catalog.json
var claudeModelCatalogData []byte

type claudeModelCatalog struct {
	Models          map[string]string       `json:"models"`
	Families        map[string]string       `json:"families"`
	ReasoningLevels []localAIReasoningLevel `json:"reasoning_levels"`
}

var tomlStringSetting = regexp.MustCompile(`^\s*([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+)["']`)

// ListLocalAIModels exposes only model names from local CLI configuration.
// It deliberately does not return credentials, paths, or other settings.
func ListLocalAIModels(c *gin.Context) {
	models := map[string][]localAIModel{
		"claude-code": claudeModels(),
		"codex":       codexModels(),
		"deep-seek":   {},
		"fake-code": {{
			ID:          "fake-code",
			Name:        "Mô phỏng",
			Description: "Không dùng model thật",
		}},
		"cursor-agent": {},
	}

	assistants := make([]localAIModelsAssistant, 0, len(models))
	for _, value := range []string{"claude-code", "codex", "deep-seek", "fake-code", "cursor-agent"} {
		assistants = append(assistants, localAIModelsAssistant{
			Value:  value,
			Models: uniqueAIModels(models[value]),
		})
	}

	c.JSON(http.StatusOK, localAIModelsResponse{Assistants: assistants})
}

func claudeModels() []localAIModel {
	var catalog claudeModelCatalog
	_ = json.Unmarshal(claudeModelCatalogData, &catalog)
	claudePath, err := exec.LookPath("claude")
	if err != nil {
		home, homeErr := os.UserHomeDir()
		if homeErr != nil {
			return nil
		}
		claudePath = filepath.Join(home, ".local", "bin", "claude")
	}
	binary, err := os.ReadFile(claudePath)
	if err != nil {
		return nil
	}

	pattern := regexp.MustCompile(`claude-(sonnet|opus|haiku|fable)-([0-9]+)(?:-([0-9]+))?`)
	models := make([]localAIModel, 0)
	for _, match := range pattern.FindAllSubmatch(binary, -1) {
		family := string(match[1])
		major, _ := strconv.Atoi(string(match[2]))
		minor := ""
		if len(match) > 3 {
			minor = string(match[3])
		}
		// Ignore dated API IDs and incomplete aliases embedded in the binary.
		if minor != "" {
			minorNumber, _ := strconv.Atoi(minor)
			if minorNumber > 99 {
				continue
			}
		}
		model := "claude-" + family + "-" + strconv.Itoa(major)
		if minor != "" {
			model += "-" + minor
		}
		description := catalog.Models[model]
		if description == "" {
			description = catalog.Families[family]
		}
		localModel := localAIModel{
			ID:              model,
			Name:            model,
			Description:     description,
			ReasoningLevels: catalog.ReasoningLevels,
		}
		models = append(models, localModel)
	}
	result := uniqueAIModels(models)
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func codexModels() []localAIModel {
	codexHome := strings.TrimSpace(os.Getenv("CODEX_HOME"))
	if codexHome == "" {
		codexHome, _ = os.UserHomeDir()
		codexHome = filepath.Join(codexHome, ".codex")
	}

	files := []string{filepath.Join(codexHome, "config.toml")}
	if profileFiles, err := filepath.Glob(filepath.Join(codexHome, "*.config.toml")); err == nil {
		files = append(files, profileFiles...)
	}

	models := make([]localAIModel, 0)
	configuredModel := ""
	configuredEffort := ""
	for _, file := range files {
		model, effort := readCodexModel(file)
		if configuredModel == "" {
			configuredModel = model
			configuredEffort = effort
		}
	}

	cacheModels, cacheErr := readCodexModelsCache(filepath.Join(codexHome, "models_cache.json"))
	if cacheErr == nil {
		for _, model := range cacheModels {
			modelName := model.Slug
			if model.Priority == 1 {
				modelName += " (default)"
			}
			if model.Slug == configuredModel {
				modelName += " (current)"
			}
			levels := make([]localAIReasoningLevel, 0, len(model.ReasoningLevels))
			for _, effort := range model.ReasoningLevels {
				levelName := reasoningLevelName(effort.Effort)
				if effort.Effort == model.DefaultReasoningLevel {
					levelName += " (default)"
				}
				if model.Slug == configuredModel && effort.Effort == configuredEffort {
					levelName += " (current)"
				}
				levels = append(levels, localAIReasoningLevel{
					Value:       effort.Effort,
					Name:        levelName,
					Description: effort.Description,
				})
			}
			models = append(models, localAIModel{
				ID:              model.Slug,
				Name:            modelName,
				Description:     model.Description,
				ReasoningLevels: levels,
			})
		}
	}
	if len(models) == 0 && configuredModel != "" {
		model := localAIModel{
			ID:   configuredModel,
			Name: configuredModel,
		}
		if configuredEffort != "" {
			model.ReasoningLevels = []localAIReasoningLevel{{
				Value: configuredEffort,
				Name:  configuredEffort,
			}}
		}
		models = append(models, model)
	}
	return uniqueAIModels(models)
}

type codexModelsCache struct {
	Models []struct {
		Slug                     string `json:"slug"`
		Description              string `json:"description"`
		Priority                 int    `json:"priority"`
		DefaultReasoningLevel    string `json:"default_reasoning_level"`
		SupportedReasoningLevels []struct {
			Effort      string `json:"effort"`
			Description string `json:"description"`
		} `json:"supported_reasoning_levels"`
	} `json:"models"`
}

func readCodexModelsCache(filename string) ([]codexModel, error) {
	contents, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	var cache codexModelsCache
	if err := json.Unmarshal(contents, &cache); err != nil {
		return nil, err
	}
	models := make([]codexModel, 0, len(cache.Models))
	for _, model := range cache.Models {
		if strings.TrimSpace(model.Slug) != "" {
			efforts := make([]codexReasoningLevel, 0, len(model.SupportedReasoningLevels))
			for _, level := range model.SupportedReasoningLevels {
				if strings.TrimSpace(level.Effort) != "" {
					efforts = append(efforts, codexReasoningLevel{
						Effort:      level.Effort,
						Description: level.Description,
					})
				}
			}
			models = append(models, codexModel{
				Slug:                  model.Slug,
				Description:           model.Description,
				Priority:              model.Priority,
				DefaultReasoningLevel: model.DefaultReasoningLevel,
				ReasoningLevels:       efforts,
			})
		}
	}
	return models, nil
}

type codexModel struct {
	Slug                  string
	Description           string
	Priority              int
	DefaultReasoningLevel string
	ReasoningLevels       []codexReasoningLevel
}

type codexReasoningLevel struct {
	Effort      string
	Description string
}

func reasoningLevelName(value string) string {
	switch value {
	case "low":
		return "Low"
	case "medium":
		return "Medium"
	case "high":
		return "High"
	case "xhigh":
		return "Extra high"
	case "max":
		return "More reasoning…"
	default:
		return value
	}
}

func readCodexModel(filename string) (string, string) {
	file, err := os.Open(filename)
	if err != nil {
		return "", ""
	}
	defer file.Close()

	settings := make(map[string]string)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		match := tomlStringSetting.FindStringSubmatch(scanner.Text())
		if len(match) == 3 {
			settings[match[1]] = strings.TrimSpace(match[2])
		}
	}
	return settings["model"], settings["model_reasoning_effort"]
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func uniqueAIModels(values []localAIModel) []localAIModel {
	seen := make(map[string]struct{}, len(values))
	result := make([]localAIModel, 0, len(values))
	for _, value := range values {
		value.ID = strings.TrimSpace(value.ID)
		if value.ID == "" {
			continue
		}
		if _, ok := seen[value.ID]; ok {
			continue
		}
		seen[value.ID] = struct{}{}
		result = append(result, value)
	}
	return result
}
