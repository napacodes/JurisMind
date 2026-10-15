// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'

const BasicForm = () => {
  return (
    <form>
      <FieldGroup className='gap-6'>
        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-name'>Name</FieldLabel>
          <Input id='horizontal-basic-name' className='sm:col-span-5' placeholder='John Doe' />
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-company'>Company</FieldLabel>
          <Input id='horizontal-basic-company' className='sm:col-span-5' placeholder='ACME Inc.' />
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-email'>Email</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupInput id='horizontal-basic-email' placeholder='john.doe' />
            <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
              @example.com
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-phone'>Phone No</FieldLabel>
          <Input id='horizontal-basic-phone' className='sm:col-span-5' type='tel' placeholder='658 799 8941' />
        </Field>

        <Field className='grid grid-cols-1 items-start gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-message'>Message</FieldLabel>
          <Textarea
            id='horizontal-basic-message'
            className='sm:col-span-5'
            placeholder='Hi, Do you have a moment to talk Joe?'
            rows={4}
          />
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

export default BasicForm
