import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  'vi-VN': {
    translation: {
      nav: {
        projects: 'Dự án',
        settings: 'Cài đặt',
        about: 'Về Auto-Devs',
        dashboard: 'Tổng quan',
        appearance: 'Giao diện',
        notifications: 'Thông báo',
        github: 'Tích hợp GitHub',
        aiExecutor: 'Trình thực thi AI',
        codeEditor: 'Trình soạn thảo mã',
      },
      common: {
        loading: 'Đang tải...',
        retry: 'Thử lại',
        cancel: 'Huỷ',
        confirm: 'Xác nhận',
        save: 'Lưu',
        edit: 'Chỉnh sửa',
        delete: 'Xoá',
        close: 'Đóng',
        backHome: 'Về trang chủ',
        status: 'Trạng thái',
        created: 'Đã tạo',
        updated: 'Đã cập nhật',
        total: 'Tổng cộng',
        active: 'Đang hoạt động',
        completed: 'Đã hoàn thành',
        noData: 'Chưa có dữ liệu',
        error: 'Đã xảy ra lỗi',
      },
      projects: {
        title: 'Dự án',
        overview: 'Tổng quan',
        tasks: 'Công việc (Task)',
        information: 'Thông tin dự án',
        activity: 'Hoạt động theo thời gian thực',
        distribution: 'Phân bổ công việc',
        notFound: 'Không tìm thấy dự án',
        loadError: 'Không thể tải dự án',
        noProjects: 'Không tìm thấy dự án nào',
        active: 'Dự án đang hoạt động',
        name: 'Tên',
        sortCreated: 'Ngày tạo',
        sortUpdated: 'Ngày cập nhật',
        ascending: 'Tăng dần',
        descending: 'Giảm dần',
      },
      tasks: {
        board: 'Bảng công việc',
        title: 'Tiêu đề',
        description: 'Mô tả',
        history: 'Lịch sử công việc',
        noTasks: 'Chưa có công việc',
        noHistory: 'Chưa có lịch sử cho công việc này.',
        actions: 'Thao tác',
        currentStatus: 'Trạng thái hiện tại',
        newStatus: 'Trạng thái mới',
        selectBranch: 'Chọn nhánh (Branch)',
        loadingBranches: 'Đang tải các nhánh...',
        planReview: 'Duyệt kế hoạch (Plan)',
        codeChanges: 'Thay đổi mã nguồn',
        executions: 'Lần thực thi',
        metadata: 'Thông tin bổ sung',
      },
      planning: {
        loading: 'Đang tải các kế hoạch...',
        empty: 'Chưa có kế hoạch nào',
        review: 'Duyệt kế hoạch',
        edit: 'Chỉnh sửa kế hoạch',
        previewEmpty: 'Không có nội dung để xem trước',
        chooseAssistant:
          'Chọn trợ lý AI để bắt đầu lập kế hoạch cho công việc:',
        approve: 'Duyệt kế hoạch và bắt đầu triển khai cho công việc:',
      },
      execution: {
        loadingLogs: 'Đang tải nhật ký...',
        noLogs: 'Không có nhật ký để hiển thị.',
        loadError: 'Không thể tải các lần thực thi',
        empty: 'Chưa có lần thực thi nào',
        duration: 'Thời lượng:',
        latest: 'Mới nhất trước',
        oldest: 'Cũ nhất trước',
        progress: 'Tiến độ',
      },
      settings: {
        description: 'Quản lý các cài đặt.',
        sound: 'Thông báo âm thanh',
        enableSound: 'Bật thông báo âm thanh',
        volume: 'Âm lượng',
        testSounds: 'Thử âm thanh',
        soundStatus: 'Trạng thái dịch vụ âm thanh',
        loadedSounds: 'Âm thanh đã tải',
      },
      errors: {
        unauthorized: 'Truy cập chưa được xác thực',
        forbidden: 'Truy cập bị từ chối',
        notFound: 'Ối! Không tìm thấy trang!',
        maintenance: 'Website đang được bảo trì!',
        general: 'Đã xảy ra lỗi không mong muốn.',
        internal: 'Lỗi máy chủ nội bộ!',
      },
      accessibility: {
        toggleTheme: 'Chuyển đổi giao diện',
        toggleSidebar: 'Chuyển đổi thanh bên',
        close: 'Đóng',
        openMenu: 'Mở trình đơn',
      },
      toast: {
        notModified: 'Nội dung không thay đổi!',
      },
    },
  },
} as const

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: 'vi-VN',
    fallbackLng: 'vi-VN',
    interpolation: { escapeValue: false },
  })
}

export default i18n

export const formatDate = (value: string | number | Date) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value)

export const formatPercent = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
