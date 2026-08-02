import {
  IconNotification,
  IconPackages,
  IconPalette,
  IconSettings,
  IconBrandGithub,
  IconRobot,
  IconCode,
  IconInfoCircle,
} from '@tabler/icons-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Chung',
      items: [
        {
          title: 'Dự án',
          url: '/projects',
          icon: IconPackages,
        },
      ],
    },
    {
      title: 'Cài đặt',
      items: [
        {
          title: 'Cài đặt',
          icon: IconSettings,
          items: [
            {
              title: 'Trình thực thi AI',
              url: '/settings/ai-executor',
              icon: IconRobot,
            },
            {
              title: 'Tích hợp GitHub',
              url: '/settings/github-integration',
              icon: IconBrandGithub,
            },
            {
              title: 'Giao diện',
              url: '/settings/appearance',
              icon: IconPalette,
            },
            {
              title: 'Thông báo',
              url: '/settings/notifications',
              icon: IconNotification,
            },
            {
              title: 'Trình soạn thảo mã',
              url: '/settings/code-editor',
              icon: IconCode,
            },
          ],
        },
        {
          title: 'Về Auto-Devs',
          url: '/about-us',
          icon: IconInfoCircle,
        },
      ],
    },
  ],
}
