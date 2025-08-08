export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-4xl text-red-600 font-bold">Access Denied</h1>
        <p className="text-gray-600">You are not authorized to view this page.</p>
      </div>
    </div>
  )
}
