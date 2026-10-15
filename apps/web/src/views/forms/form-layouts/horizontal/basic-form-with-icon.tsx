// Third-party Imports
import { Building2Icon, MailIcon, MessageSquareIcon, PhoneIcon, UserIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'

const BasicFormWithIcon = () => {
  return (
    <form>
      <FieldGroup className='gap-6'>
        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-name'>Name</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <UserIcon className='size-4' />
              <span className='sr-only'>Name</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-name' type='text' placeholder='John Doe' />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-company'>Company</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <Building2Icon className='size-4' />
              <span className='sr-only'>Company</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-company' placeholder='ACME Inc.' />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-email'>Email</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <MailIcon className='size-4' />
              <span className='sr-only'>Email</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-email' placeholder='john.doe' />
            <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
              @example.com
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-phone'>Phone No</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <PhoneIcon className='size-4' />
              <span className='sr-only'>Phone</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-phone' type='tel' placeholder='658 799 8941' />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 items-start gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-message'>Message</FieldLabel>
          <div className='relative sm:col-span-5'>
            <div className='text-muted-foreground pointer-events-none absolute top-2.5 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
              <MessageSquareIcon className='size-4' />
              <span className='sr-only'>Message</span>
            </div>
            <Textarea
              id='horizontal-basic-icons-message'
              placeholder='Hi, Do you have a moment to talk Joe?'
              className='peer pl-9'
              rows={4}
            />
          </div>
        </Field>

        <Field className='grid grid-cols-1 sm:grid-cols-6'>
          <div className='sm:col-start-2'>
            <Button type='submit'>Send</Button>
          </div>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default BasicFormWithIcon
