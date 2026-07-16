import { ImagePlus } from 'lucide-react'

type ProofGalleryProps = {
  notes: string
  uploadedTime: string
  verificationStatus: string
}

export function ProofGallery({
  notes,
  uploadedTime,
  verificationStatus,
}: ProofGalleryProps) {
  return (
    <section className="border-t border-border pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Work Proof</h2>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          Required
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {['Before Photo', 'After Photo'].map((label) => (
          <div key={label}>
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {label}
            </p>
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground">
              <ImagePlus aria-hidden="true" className="size-6" />
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="inline font-medium text-muted-foreground">Completion Notes: </dt>
          <dd className="inline text-foreground">{notes}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-muted-foreground">Uploaded Time: </dt>
          <dd className="inline text-foreground">{uploadedTime}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-muted-foreground">Verification Status: </dt>
          <dd className="inline text-foreground">{verificationStatus}</dd>
        </div>
      </dl>
    </section>
  )
}
