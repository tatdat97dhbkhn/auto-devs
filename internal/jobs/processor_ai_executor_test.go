package jobs

import (
	"testing"

	aiexecutors "github.com/auto-devs/auto-devs/internal/ai-executors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProcessorGetAiExecutorCodex(t *testing.T) {
	executor, err := (&Processor{}).getAiExecutor("codex")
	require.NoError(t, err)
	assert.IsType(t, &aiexecutors.CodexExecutor{}, executor)
}

func TestProcessorGetAiExecutorRejectsInvalidType(t *testing.T) {
	_, err := (&Processor{}).getAiExecutor("not-an-assistant")
	require.EqualError(t, err, "invalid execution type: not-an-assistant")
}
