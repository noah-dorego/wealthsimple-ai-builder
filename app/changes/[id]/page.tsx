interface Props {
  params: Promise<{ id: string }>
}

export default async function ChangeDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Change Detail</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Change ID: <span className="font-mono">{id}</span>
      </p>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Change detail view — coming soon.
      </p>
    </div>
  )
}
