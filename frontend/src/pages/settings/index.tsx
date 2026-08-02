import { Outlet } from '@tanstack/react-router'
import {
  IconBell,
  IconBrandGithub,
  IconCode,
  IconPalette,
  IconRobot,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import SidebarNav from './components/sidebar-nav'

export default function Settings() {
  const { t } = useTranslation()
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
        </div>
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('nav.settings')}
          </h1>
          <p className='text-muted-foreground'>{t('settings.description')}</p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}

const sidebarNavItems = [
  {
    title: 'Trình thực thi AI',
    icon: <IconRobot size={18} />,
    href: '/settings/ai-executor',
  },
  {
    title: 'Tích hợp GitHub',
    icon: <IconBrandGithub size={18} />,
    href: '/settings/github-integration',
  },
  {
    title: 'Giao diện',
    icon: <IconPalette size={18} />,
    href: '/settings/appearance',
  },
  {
    title: 'Thông báo',
    icon: <IconBell size={18} />,
    href: '/settings/notifications',
  },
  {
    title: 'Trình soạn thảo mã',
    icon: <IconCode size={18} />,
    href: '/settings/code-editor',
  },
]
