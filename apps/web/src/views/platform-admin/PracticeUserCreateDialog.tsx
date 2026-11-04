'use client'

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type Options = Awaited<ReturnType<typeof api.practiceUserCreationOptions>>
type AccountType = 'FIRM' | 'LAWYER' | 'ASSISTANT'
const countries = [['AE','United Arab Emirates','+971'],['AU','Australia','+61'],['BE','Belgium','+32'],['BR','Brazil','+55'],['CA','Canada','+1'],['CH','Switzerland','+41'],['DE','Germany','+49'],['DZ','Algeria','+213'],['DK','Denmark','+45'],['EG','Egypt','+20'],['ES','Spain','+34'],['FR','France','+33'],['GB','United Kingdom','+44'],['IN','India','+91'],['IE','Ireland','+353'],['IT','Italy','+39'],['MA','Morocco','+212'],['MX','Mexico','+52'],['NG','Nigeria','+234'],['NL','Netherlands','+31'],['NO','Norway','+47'],['NZ','New Zealand','+64'],['PK','Pakistan','+92'],['PT','Portugal','+351'],['QA','Qatar','+974'],['SA','Saudi Arabia','+966'],['SE','Sweden','+46'],['TN','Tunisia','+216'],['TR','Türkiye','+90'],['US','United States','+1'],['ZA','South Africa','+27']] as const
const inputClass = 'mt-1 h-10 rounded-lg border-slate-200 dark:border-border bg-white dark:bg-background'
const labelClass = 'block text-xs font-medium text-slate-700 dark:text-slate-200'
const initial = { firstName:'', lastName:'', username:'', email:'', countryCode:'DZ', localPhone:'', password:'', confirm:'', accountType:'FIRM' as AccountType, firmName:'', workspaceMode:'INDIVIDUAL' as 'INDIVIDUAL'|'FIRM', workspaceId:'', practiceName:'', supervisorMembershipId:'', active:true }

export function PracticeUserCreateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState(initial)
  const [options, setOptions] = useState<Options | null>(null)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const country = countries.find(([code]) => code === form.countryCode) ?? countries[0]
  const passwordStrength = useMemo(() => [form.password.length >= (options?.passwordMinLength ?? 8), /[a-z]/.test(form.password) && /[A-Z]/.test(form.password), /\d/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length, [form.password, options])

  useEffect(() => { if (!photo) return; const reader = new FileReader(); reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : ''); reader.readAsDataURL(photo); return () => reader.abort() }, [photo])
  useEffect(() => { if (!open) return; let live = true; void api.practiceUserCreationOptions().then((data) => { if (live) setOptions(data) }).catch(() => { if (live) setError('Could not load firm and supervising lawyer options.') }).finally(() => { if (live) setLoadingOptions(false) }); return () => { live = false } }, [open])
  function set<K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) { setForm((current) => ({ ...current, [key]: value })) }
  function close(next: boolean) { if (!saving) { onOpenChange(next); if (!next) { setForm(initial); setPhoto(null); setError('') } } }
  function choosePhoto(file?: File) { if (!file) return; if (!['image/png','image/jpeg','image/gif'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) { setError('Choose a PNG, JPG, or GIF image smaller than 2 MB.'); return }; setError(''); setPreview(''); setPhoto(file) }
  function generatePassword() { const bytes = crypto.getRandomValues(new Uint8Array(20)); const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'; set('password', Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')) }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < (options?.passwordMinLength ?? 8)) { setError(`Password must be at least ${options?.passwordMinLength ?? 8} characters.`); return }
    const rawPhone = form.localPhone.trim()
    let digits = rawPhone.replace(/\D/g, '')
    const dialDigits = country[2].slice(1)
    if (rawPhone.startsWith('+') && digits.startsWith(dialDigits)) digits = digits.slice(dialDigits.length)
    else if (rawPhone.startsWith('00') && digits.startsWith(`00${dialDigits}`)) digits = digits.slice(dialDigits.length + 2)
    const phoneNumber = `${country[2]}${digits.replace(/^0+/, '')}`
    const data = new FormData()
    const common = { firstName:form.firstName, lastName:form.lastName, username:form.username, email:form.email, countryCode:form.countryCode, phoneNumber, password:form.password, status:form.active?'ACTIVE':'DISABLED', accountType:form.accountType }
    Object.entries(common).forEach(([key,value]) => data.append(key,value))
    if (form.accountType === 'FIRM') data.append('firmName', form.firmName)
    if (form.accountType === 'LAWYER') { data.append('workspaceMode', form.workspaceMode); if (form.workspaceMode === 'FIRM') data.append('workspaceId', form.workspaceId); else if (form.practiceName) data.append('practiceName', form.practiceName) }
    if (form.accountType === 'ASSISTANT') data.append('supervisorMembershipId', form.supervisorMembershipId)
    if (photo) data.append('photo', photo)
    setSaving(true)
    try { await api.createPracticeUser(data); toast.success('Practice user created successfully.'); onOpenChange(false); setForm(initial); setPhoto(null); onCreated() }
    catch (cause) { setError(cause instanceof ApiError && cause.status === 409 ? 'That username or email is already in use.' : cause instanceof Error ? cause.message : 'Could not create this account.') }
    finally { setSaving(false) }
  }

  return <Dialog open={open} onOpenChange={close}><DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-3xl gap-4'><DialogHeader><DialogTitle className='text-xl'>Add a practice user</DialogTitle><DialogDescription>Create a Firm, Lawyer, or Assistant account and assign it to the appropriate workspace.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className='space-y-5'>
      <section className='rounded-xl border border-slate-200 dark:border-border p-4'><h3 className='mb-3 font-semibold'>Profile</h3><div className='grid grid-cols-1 gap-3 sm:grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)] sm:items-start sm:gap-4'><div className='flex flex-col items-center gap-1.5'><div className='flex size-16 items-center justify-center overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'>{photo && preview ? <img src={preview} alt='Profile preview' className='size-full object-cover' /> : <ImagePlus className='size-6' />}</div><label className='inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted'>Upload image<input className='sr-only' type='file' accept='image/png,image/jpeg,image/gif' onChange={(event) => { choosePhoto(event.target.files?.[0]); event.currentTarget.value = '' }} /></label><p className='text-center text-[11px] leading-tight text-muted-foreground'>PNG, JPG, or GIF · maximum 2 MB</p>{photo && <Button type='button' variant='ghost' size='sm' onClick={() => setPhoto(null)}><Trash2 className='mr-1 size-3.5' />Remove</Button>}</div><label className={labelClass}>First name<Input required maxLength={100} className={inputClass} value={form.firstName} onChange={(e)=>set('firstName',e.target.value)} /></label><label className={labelClass}>Last name<Input required maxLength={100} className={inputClass} value={form.lastName} onChange={(e)=>set('lastName',e.target.value)} /></label></div></section>
      <section className='rounded-xl border border-slate-200 dark:border-border p-4'><h3 className='mb-3 font-semibold'>Contact information</h3><div className='grid gap-3 sm:grid-cols-2'><label className={labelClass}>Username<Input required minLength={3} maxLength={32} pattern='[A-Za-z0-9][A-Za-z0-9._-]{1,30}[A-Za-z0-9]' className={inputClass} value={form.username} onChange={(e)=>set('username',e.target.value)} /></label><label className={labelClass}>Email address<Input required type='email' maxLength={320} className={inputClass} value={form.email} onChange={(e)=>set('email',e.target.value)} /></label><label className={labelClass}>Country<select required className={`${inputClass} w-full px-3 text-sm`} value={form.countryCode} onChange={(e)=>set('countryCode',e.target.value)}>{countries.map(([code,name,dial])=><option key={code} value={code}>{name} ({dial})</option>)}</select></label><label className={labelClass}>Phone number<div className='mt-1 flex gap-2'><span className='flex h-10 items-center rounded-lg border px-3 text-sm text-muted-foreground'>{country[2]}</span><Input required type='tel' inputMode='tel' maxLength={20} className='h-10' value={form.localPhone} onChange={(e)=>set('localPhone',e.target.value)} placeholder='Phone number' /></div></label></div></section>
      <section className='rounded-xl border border-slate-200 dark:border-border p-4'><h3 className='mb-3 font-semibold'>Account security</h3><div className='grid gap-3 sm:grid-cols-2'><label className={labelClass}>Password<div className='mt-1 flex gap-2'><Input required minLength={options?.passwordMinLength ?? 8} type={showPassword?'text':'password'} autoComplete='new-password' className='h-10' value={form.password} onChange={(e)=>set('password',e.target.value)} /><Button type='button' variant='outline' size='icon' aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff className='size-4'/>:<Eye className='size-4'/>}</Button></div></label><label className={labelClass}>Confirm password<div className='mt-1 flex gap-2'><Input required type={showConfirm?'text':'password'} autoComplete='new-password' className='h-10' value={form.confirm} onChange={(e)=>set('confirm',e.target.value)} /><Button type='button' variant='outline' size='icon' aria-label={showConfirm?'Hide confirmation':'Show confirmation'} onClick={()=>setShowConfirm(!showConfirm)}>{showConfirm?<EyeOff className='size-4'/>:<Eye className='size-4'/>}</Button></div></label></div><div className='mt-2 flex items-center justify-between'><p className='text-[11px] text-muted-foreground'>Minimum {options?.passwordMinLength ?? 8} characters · Strength: {['Weak','Fair','Good','Strong','Strong'][passwordStrength]}</p><Button type='button' variant='outline' size='sm' onClick={generatePassword}><RefreshCw className='mr-1 size-3.5'/>Generate</Button></div><div className='mt-2 h-1.5 rounded-full bg-muted'><div className={`h-full rounded-full transition-all ${passwordStrength<2?'bg-rose-500':passwordStrength<4?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${passwordStrength*25}%`}} /></div></section>
      <section className='rounded-xl border border-slate-200 dark:border-border p-4'><h3 className='mb-3 font-semibold'>Account role</h3><div className='grid gap-2 sm:grid-cols-3'>{([['FIRM','Firm','Firm administrator'],['LAWYER','Lawyer','Legal professional'],['ASSISTANT','Assistant','Support staff']] as const).map(([value,title,desc])=><label key={value} className={`cursor-pointer rounded-lg border p-3 ${form.accountType===value?'border-violet-500 bg-violet-50 dark:bg-violet-500/10':'border-slate-200 dark:border-border'}`}><input className='mr-2 accent-violet-600' type='radio' name='accountType' value={value} checked={form.accountType===value} onChange={()=>set('accountType',value)} /><span className='font-semibold'>{title}</span><span className='mt-1 block pl-5 text-xs text-muted-foreground'>{desc}</span></label>)}</div>
      {form.accountType==='FIRM' && <label className={`${labelClass} mt-3`}>Firm name<Input required maxLength={200} className={inputClass} value={form.firmName} onChange={(e)=>set('firmName',e.target.value)} /></label>}
      {form.accountType==='LAWYER' && <div className='mt-3 space-y-3'><label className={labelClass}>Workspace type<select className={`${inputClass} w-full px-3 text-sm`} value={form.workspaceMode} onChange={(e)=>set('workspaceMode',e.target.value as 'INDIVIDUAL'|'FIRM')}><option value='INDIVIDUAL'>Individual practice</option><option value='FIRM'>Existing firm</option></select></label>{form.workspaceMode==='FIRM'?<label className={labelClass}>Firm<select required className={`${inputClass} w-full px-3 text-sm`} value={form.workspaceId} onChange={(e)=>set('workspaceId',e.target.value)}><option value=''>Select a firm</option>{options?.firms.map((firm)=><option key={firm.id} value={firm.id}>{firm.name}</option>)}</select></label>:<label className={labelClass}>Practice name (optional)<Input maxLength={200} className={inputClass} value={form.practiceName} onChange={(e)=>set('practiceName',e.target.value)} placeholder={`${form.firstName || 'Lawyer'}'s Practice`} /></label>}</div>}
      {form.accountType==='ASSISTANT' && <label className={`${labelClass} mt-3`}>Supervising lawyer<select required className={`${inputClass} w-full px-3 text-sm`} value={form.supervisorMembershipId} onChange={(e)=>set('supervisorMembershipId',e.target.value)}><option value=''>Select a lawyer</option>{options?.lawyers.map((lawyer)=><option key={lawyer.id} value={lawyer.id}>{lawyer.user.fullName} · {lawyer.workspace.name}</option>)}</select></label>}
      </section>
      <section className='flex items-center justify-between rounded-xl border border-slate-200 dark:border-border p-4'><div><h3 className='font-semibold'>Account status</h3><p className='text-xs text-muted-foreground'>Inactive accounts cannot sign in until enabled.</p></div><label className='flex items-center gap-2 text-sm'><input type='checkbox' className='size-4 accent-violet-600' checked={form.active} onChange={(e)=>set('active',e.target.checked)} />Active</label></section>
      {loadingOptions && <p role='status' className='text-xs text-muted-foreground'>Loading firm and lawyer options…</p>}{error && <p role='alert' className='rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'>{error}</p>}
      <DialogFooter><Button type='button' variant='outline' disabled={saving} onClick={()=>close(false)}>Cancel</Button><Button type='submit' disabled={saving || loadingOptions || !options} className='bg-violet-600 text-white hover:bg-violet-700'>{saving?'Creating…':'Create user'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
