// Component Imports
import { Card, CardContent } from '@/components/ui/card'
import BasicForm from './basic-form'
import BasicFormWithIcon from './basic-form-with-icon'

const HorizontalForm = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-3'>
          <h2 className='text-lg font-semibold'>Basic Form</h2>
          <Card>
            <CardContent>
              <BasicForm />
            </CardContent>
          </Card>
        </div>

        <div className='space-y-3'>
          <h2 className='text-lg font-semibold'>Basic Form with Icon</h2>
          <Card>
            <CardContent>
              <BasicFormWithIcon />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HorizontalForm
