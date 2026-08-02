import { useState, useEffect } from 'react'
import { soundService } from '@/services/soundService'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function NotificationsForm() {
  const [soundEnabled, setSoundEnabled] = useState(
    soundService.isEnabledValue()
  )
  const [volume, setVolume] = useState(soundService.getVolume())
  const [soundStatus, setSoundStatus] = useState(soundService.getStatus())

  useEffect(() => {
    setSoundEnabled(soundService.isEnabledValue())
    setVolume(soundService.getVolume())
    setSoundStatus(soundService.getStatus())

    // Update status periodically to show initialization progress
    const interval = setInterval(() => {
      setSoundStatus(soundService.getStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    soundService.setEnabled(enabled)
    toast.success(
      enabled ? 'Đã bật thông báo âm thanh' : 'Đã tắt thông báo âm thanh'
    )
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    soundService.setVolume(newVolume)
  }

  const testPlanSound = async () => {
    try {
      await soundService.testPlanSound()
      toast.success('Đã phát âm thanh hoàn tất kế hoạch!')
    } catch (error) {
      toast.error('Không thể phát âm thanh. Hãy kiểm tra quyền trình duyệt.')
    }
  }

  const testCodeSound = async () => {
    try {
      await soundService.testCodeSound()
      toast.success('Đã phát âm thanh hoàn tất mã nguồn!')
    } catch (error) {
      toast.error('Không thể phát âm thanh. Hãy kiểm tra quyền trình duyệt.')
    }
  }

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Thông báo âm thanh</CardTitle>
          <CardDescription>
            Cấu hình thông báo âm thanh khi trạng thái công việc thay đổi
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <Label htmlFor='sound-enabled'>Bật thông báo âm thanh</Label>
              <p className='text-muted-foreground text-sm'>
                Phát âm thanh khi công việc chuyển sang trạng thái Duyệt kế
                hoạch hoặc Duyệt mã nguồn
              </p>
            </div>
            <Switch
              id='sound-enabled'
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>

          {soundEnabled && (
            <>
              <div className='space-y-3'>
                <Label htmlFor='volume'>Âm lượng</Label>
                <div className='flex items-center space-x-3'>
                  <input
                    id='volume'
                    type='range'
                    min='0'
                    max='1'
                    step='0.1'
                    value={volume}
                    onChange={(e) =>
                      handleVolumeChange(parseFloat(e.target.value))
                    }
                    className='h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200'
                  />
                  <span className='text-muted-foreground w-10 text-sm'>
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>

              <div className='space-y-3'>
                <Label>Thử âm thanh</Label>
                <div className='flex gap-3'>
                  <Button variant='outline' onClick={testPlanSound}>
                    Thử âm thanh hoàn tất kế hoạch
                  </Button>
                  <Button variant='outline' onClick={testCodeSound}>
                    Thử âm thanh hoàn tất mã nguồn
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => soundService.debugAudioElements()}
                    className='text-xs'
                  >
                    Gỡ lỗi console
                  </Button>
                </div>
                <p className='text-muted-foreground text-sm'>
                  • Hoàn tất kế hoạch: Phát khi công việc chuyển sang trạng thái
                  Duyệt kế hoạch
                  <br />• Hoàn tất mã nguồn: Phát khi công việc chuyển sang
                  trạng thái Duyệt mã nguồn
                </p>
              </div>

              {/* Sound Service Status */}
              <div className='space-y-3'>
                <Label>Trạng thái dịch vụ âm thanh</Label>
                <div className='bg-muted space-y-2 rounded-lg p-3 text-sm'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Trạng thái:</span>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        soundStatus.isInitialized
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {soundStatus.isInitialized
                        ? 'Sẵn sàng'
                        : 'Đang khởi tạo...'}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium'>Âm thanh đã tải:</span>
                    <span className='text-muted-foreground'>
                      {soundStatus.loadedSounds.length > 0
                        ? soundStatus.loadedSounds.join(', ')
                        : 'Không có'}
                    </span>
                  </div>
                  {!soundStatus.isInitialized && (
                    <p className='text-muted-foreground text-xs'>
                      Dịch vụ âm thanh đang khởi tạo. Vui lòng đợi một chút
                      trước khi thử âm thanh.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
