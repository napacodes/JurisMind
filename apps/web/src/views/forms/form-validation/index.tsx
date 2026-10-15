// Component Imports
import RegistrationForm from './registration-demo-form'
import ValidationModesDemo from './validation-demos'

const FormValidation = () => {
  return (
    <div className='flex flex-col gap-8'>
      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>Registration Form</h2>
        <RegistrationForm />
      </div>
      <ValidationModesDemo />
    </div>
  )
}

export default FormValidation
