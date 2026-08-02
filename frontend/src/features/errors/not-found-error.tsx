import { useNavigate, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function NotFoundError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  const { t } = useTranslation()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
        <span className='font-medium'>{t('errors.notFound')}</span>
        <p className='text-muted-foreground text-center'>
          Trang bạn đang tìm kiếm <br /> không tồn tại hoặc đã bị xoá.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Quay lại
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>
            {t('common.backHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
