import React from 'react';

const MetricCard = ({ title, value, icon: Icon, color, theme }) => (
  <div className={`p-5 rounded-xl flex items-center justify-between border transition-all ${
    theme === 'dark' ? 'bg-dark-card border-dark-border hover:border-gray-600' : 'ui-card-soft ui-card-soft-hover'
  }`}>
    <div>
      <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm font-medium`}>{title}</p>
      <h3 className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
    </div>
    <div className={`p-3 rounded-lg bg-opacity-10 ${color}`}>
      <Icon className={`w-6 h-6 stroke-current ${color}`} />
    </div>
  </div>
);

export default MetricCard;
