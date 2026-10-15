'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { CheckCheckIcon } from 'lucide-react'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .regex(/^\+?[0-9()\-\s]{8,20}$/, 'Please enter a valid phone number.'),
  company: z.string().min(2, 'Company name must be at least 2 characters.'),
  email: z.string().min(1, 'Email is required').email({ message: 'Please enter a valid email address.' }),
  orderId: z.string().min(3, 'Order ID is required.'),
  issue: z.string().min(1, {
    message: 'Kindly select an issue.'
  }),
  department: z.string().min(1, {
    message: 'Kindly select a department.'
  }),
  priority: z.string().min(1, {
    message: 'Kindly select a priority.'
  }),
  selectedOption: z.enum(['replace', 'refund', 'support'], {
    required_error: 'Selection of an option is required.'
  }),
  message: z.string().min(50, 'Describe your issue using at least 50 characters.')
})

type FormValues = z.infer<typeof formSchema>

const ContactUSFormDemo = () => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      company: '',
      email: '',
      orderId: '',
      issue: '',
      department: '',
      priority: '',
      selectedOption: undefined,
      message: ''
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-122 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon />
        <AlertTitle>Issue submitted successfully! Our team will reach out to you shortly.</AlertTitle>
      </Alert>
    ))
  }

  return (
    <Card className='w-full shadow-none'>
      <CardHeader>
        <CardTitle>Report Issue</CardTitle>
        <CardDescription>Describe the issue you&apos;re facing; our team will help you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className='grid w-full grid-cols-1 gap-6 md:grid-cols-2'>
          <Controller
            name='name'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder='Your full name'
                  autoComplete='name'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='phone'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type='tel'
                  aria-invalid={fieldState.invalid}
                  placeholder='Phone number'
                  autoComplete='tel'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='company'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Company</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder='Company name'
                  autoComplete='organization'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Email Field */}
          <Controller
            name='email'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type='email'
                  aria-invalid={fieldState.invalid}
                  placeholder='Email address'
                  autoComplete='email'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='orderId'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Order ID</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Order ID' />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Issue Select Field */}
          <Controller
            name='issue'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='issue'>Issue</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='issue' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Issue you are facing' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='damaged'>Product is Damaged</SelectItem>
                    <SelectItem value='got-different'>Received wrong product</SelectItem>
                    <SelectItem value='not-like'>Not as expectation</SelectItem>
                    <SelectItem value='other'>Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='department'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='department'>Department</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='department' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Select department' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='sales'>Sales</SelectItem>
                    <SelectItem value='billing'>Billing</SelectItem>
                    <SelectItem value='returns'>Returns</SelectItem>
                    <SelectItem value='technical'>Technical Support</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='priority'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='priority'>Priority</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='priority' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder='Select priority' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low'>Low</SelectItem>
                    <SelectItem value='medium'>Medium</SelectItem>
                    <SelectItem value='high'>High</SelectItem>
                    <SelectItem value='urgent'>Urgent</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Radio Group Field */}
          <Controller
            name='selectedOption'
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet className='md:col-span-2'>
                <FieldLegend variant='label'>How can we help you?</FieldLegend>
                <RadioGroup name={field.name} value={field.value ?? ''} onValueChange={field.onChange}>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='replace' id='want-replace' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-replace' className='font-normal'>
                      Need a product replacement
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='refund' id='want-refund' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-refund' className='font-normal'>
                      Need a refund
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='support' id='want-support' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-support' className='font-normal'>
                      Need guidance or support
                    </FieldLabel>
                  </Field>
                </RadioGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldSet>
            )}
          />

          {/* Message Textarea Field */}
          <Controller
            name='message'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
                <FieldLabel htmlFor={field.name}>Please describe your issue</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder='Provide detailed information about your issue'
                  className='min-h-30 resize-none'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type='submit' className='md:col-span-2 md:w-fit'>
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ContactUSFormDemo
