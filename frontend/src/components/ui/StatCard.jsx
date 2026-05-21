export default function StatCard({ title, value, icon: Icon, colorClass, subtitle }) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
      </div>
    </div>
  );
}
