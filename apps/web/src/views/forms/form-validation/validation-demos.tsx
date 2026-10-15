'use client'

// React Imports
import * as React from 'react'

// Third-party Imports
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'

// Component Imports
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Schema for validation mode demo
const modeSchema = z.object({
  onChange: z.string().min(5, 'Must be at least 5 characters').max(20, 'Must be at most 20 characters'),
  onBlur: z.string().min(5, 'Must be at least 5 characters').max(20, 'Must be at most 20 characters'),
  onSubmit: z.string().min(5, 'Must be at least 5 characters').max(20, 'Must be at most 20 characters'),
  onTouched: z.string().min(5, 'Must be at least 5 characters').max(20, 'Must be at most 20 characters')
})

type ModeFormValues = z.infer<typeof modeSchema>

const ValidationModesDemo = () => {
  // Form with onChange mode
  const onChangeForm = useForm<Pick<ModeFormValues, 'onChange'>>({
    resolver: zodResolver(z.object({ onChange: modeSchema.shape.onChange })),
    mode: 'onChange',
    defaultValues: {
      onChange: ''
    }
  })

  // Form with onBlur mode
  const onBlurForm = useForm<Pick<ModeFormValues, 'onBlur'>>({
    resolver: zodResolver(z.object({ onBlur: modeSchema.shape.onBlur })),
    mode: 'onBlur',
    defaultValues: {
      onBlur: ''
    }
  })

  // Form with onSubmit mode
  const onSubmitForm = useForm<Pick<ModeFormValues, 'onSubmit'>>({
    resolver: zodResolver(z.object({ onSubmit: modeSchema.shape.onSubmit })),
    mode: 'onSubmit',
    defaultValues: {
      onSubmit: ''
    }
  })

  // Form with onTouched mode
  const onTouchedForm = useForm<Pick<ModeFormValues, 'onTouched'>>({
    resolver: zodResolver(z.object({ onTouched: modeSchema.shape.onTouched })),
    mode: 'onTouched',
    defaultValues: {
      onTouched: ''
    }
  })

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold'>Validation Modes Demo</h2>
        <p className='text-muted-foreground'>
          Experience how different validation modes affect user experience. Try typing in each field to see when
          validation occurs.
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
        {/* onChange Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>onChange Mode</CardTitle>
            <CardDescription>Validates on every keystroke</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onChangeForm.handleSubmit(() => {
                alert('onChange form submitted successfully!')
                onChangeForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onChange'
                control={onChangeForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Demo Input</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Type here...' />
                    <FieldDescription>
                      Error appears <strong>instantly</strong> as you type
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  Submit
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onChangeForm.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onBlur Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>onBlur Mode</CardTitle>
            <CardDescription>Validates when you leave the field</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onBlurForm.handleSubmit(() => {
                alert('onBlur form submitted successfully!')
                onBlurForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onBlur'
                control={onBlurForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Demo Input</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Type here...' />
                    <FieldDescription>
                      Error appears <strong>after</strong> you leave the field
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  Submit
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onBlurForm.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onSubmit Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>onSubmit Mode (Default)</CardTitle>
            <CardDescription>Validates only when you click submit</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmitForm.handleSubmit(() => {
                alert('onSubmit form submitted successfully!')
                onSubmitForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onSubmit'
                control={onSubmitForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Demo Input</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Type here...' />
                    <FieldDescription>
                      Error appears <strong>only</strong> after clicking submit
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  Submit
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onSubmitForm.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onTouched Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>onTouched Mode</CardTitle>
            <CardDescription>Validates on blur, then on every change</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onTouchedForm.handleSubmit(() => {
                alert('onTouched form submitted successfully!')
                onTouchedForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onTouched'
                control={onTouchedForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Demo Input</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder='Type here...' />
                    <FieldDescription>
                      First validation on blur, then <strong>real-time</strong>
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  Submit
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onTouchedForm.reset()}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <div className='overflow-hidden rounded-lg border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted'>
            <tr>
              <th className='p-4 text-left font-semibold'>Mode</th>
              <th className='p-4 text-left font-semibold'>When Validation Occurs</th>
              <th className='p-4 text-left font-semibold'>Best For</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>onChange</td>
              <td className='p-4'>Every keystroke</td>
              <td className='p-4'>Real-time feedback (e.g., password strength)</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>onBlur</td>
              <td className='p-4'>When leaving the field</td>
              <td className='p-4'>Less intrusive validation (recommended for most cases)</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>onSubmit</td>
              <td className='p-4'>When form is submitted</td>
              <td className='p-4'>Simple forms, minimal interruption</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>onTouched</td>
              <td className='p-4'>First blur, then every change</td>
              <td className='p-4'>Balance between UX and feedback</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ValidationModesDemo
