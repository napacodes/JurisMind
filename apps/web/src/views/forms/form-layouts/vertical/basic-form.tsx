// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'

const BasicForm = () => {
  return (
    <form>
      <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-first-name'>First Name</FieldLabel>
          <Input id='multi-step-personal-info-first-name' placeholder='John' />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-last-name'>Last Name</FieldLabel>
          <Input id='multi-step-personal-info-last-name' placeholder='Doe' />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-mobile'>Mobile</FieldLabel>
          <Input id='multi-step-personal-info-mobile' placeholder='+1 (555) 123-4567' />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-pincode'>Pincode</FieldLabel>
          <Input id='multi-step-personal-info-pincode' placeholder='Postal Code' />
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='multi-step-personal-info-address'>Address</FieldLabel>
          <Input id='multi-step-personal-info-address' placeholder='123 Main St' />
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='multi-step-personal-info-landmark'>Landmark</FieldLabel>
          <Input id='multi-step-personal-info-landmark' placeholder='Near Central Park, New York' />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-city'>City</FieldLabel>
          <Input id='multi-step-personal-info-city' placeholder='New York' />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-state'>State</FieldLabel>
          <Input id='multi-step-personal-info-state' placeholder='NY' />
        </Field>
      </FieldGroup>

      <div className='mt-8'>
        <Button type='submit'>Save Information</Button>
      </div>
    </form>
  )
}

export default BasicForm
