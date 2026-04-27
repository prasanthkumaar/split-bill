type ShareHeaderProps = {
  name: string
}

export function ShareHeader({ name }: ShareHeaderProps) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <h1 className="w-full text-center text-xl font-semibold md:text-left">
        {name}
      </h1>
    </div>
  )
}
