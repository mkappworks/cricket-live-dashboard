import { useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { matchNameSchema } from '../lib/schemas'
import { matchesApi } from '../api'
import type { AxiosError } from 'axios'

interface Props {
  onClose: () => void
}

export function CreateMatchModal({ onClose }: Props) {
  const router = useRouter()

  const createMatch = useMutation({
    mutationFn: async (name: string) => {
      const { data } = await matchesApi.create(name)
      return data
    },
    onSuccess: (match) => {
      onClose()
      router.navigate({ to: '/match/$id', params: { id: match.id } })
    },
  })

  const form = useForm({
    defaultValues: { name: '' },
    validators: { onChange: matchNameSchema },
    onSubmit: async ({ value }) => {
      await createMatch.mutateAsync(value.name.trim())
    },
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-gray-200 dark:bg-green-950 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-lg">
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4">New match</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field
            name="name"
            validators={{ onChange: matchNameSchema.shape.name }}
          >
            {(field) => (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Match name (e.g. Test Match 2024)"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 dark:bg-white/10 dark:border-white/20 dark:text-white dark:placeholder-white/40 dark:focus:border-white/50"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {typeof field.state.meta.errors[0] === 'string'
                      ? field.state.meta.errors[0]
                      : field.state.meta.errors[0]?.message}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {createMatch.error && (
            <p className="text-sm text-red-500 dark:text-red-400">
              {(createMatch.error as AxiosError<{ error: string }>).response?.data?.error ??
                createMatch.error.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 dark:border-white/20 dark:text-white/70 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {isSubmitting ? 'Creating…' : 'Create'}
                </button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </div>
  )
}
