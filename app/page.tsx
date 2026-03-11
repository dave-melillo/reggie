export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Wedding Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Guest Count</h2>
          <p className="text-3xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-500 mt-1">Total invited</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Budget</h2>
          <p className="text-3xl font-bold text-green-600">$0</p>
          <p className="text-sm text-gray-500 mt-1">Total budget</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Vendors</h2>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-500 mt-1">Contracted</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Tasks</h2>
          <p className="text-3xl font-bold text-orange-600">0</p>
          <p className="text-sm text-gray-500 mt-1">Pending</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">RSVP Status</h2>
          <p className="text-3xl font-bold text-purple-600">0%</p>
          <p className="text-sm text-gray-500 mt-1">Confirmed</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Days Until</h2>
          <p className="text-3xl font-bold text-pink-600">--</p>
          <p className="text-sm text-gray-500 mt-1">The big day</p>
        </div>
      </div>
    </div>
  );
}
