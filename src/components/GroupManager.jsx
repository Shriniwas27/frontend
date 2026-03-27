import React, { useState } from 'react';
import { 
  XCircle, 
  Plus, 
  FolderOpen, 
  Trash2, 
  CheckCircle2,
  Loader2,
  Palette
} from 'lucide-react';
import { createGroup, updateGroup, deleteGroup } from '../api';

const COLORS = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9334e6', '#e91e63', '#00bcd4', '#ff5722'];

const getDisplayServiceName = (name) => {
  if (typeof name !== 'string') return name;
  return name.includes('/services/') ? name.split('/services/').pop() : name;
};

const GroupManager = ({ isOpen, onClose, theme, services, groups, onGroupsChange }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('environment');
  const [newGroupColor, setNewGroupColor] = useState('#1a73e8');
  const [selectedServices, setSelectedServices] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);

  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const toggleServiceSelection = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreating(true);
    try {
      const userId = JSON.parse(localStorage.getItem('cybermedic_user') || '{}')?.id;
      await createGroup({
        userId,
        name: newGroupName,
        type: newGroupType,
        serviceIds: selectedServices,
        color: newGroupColor
      });
      setNewGroupName('');
      setSelectedServices([]);
      onGroupsChange();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Delete this group? Services will not be deleted.')) return;
    try {
      await deleteGroup(groupId);
      onGroupsChange();
    } catch (err) {
      console.error('Failed to delete group', err);
    }
  };

  const handleAddServiceToGroup = async (groupId, serviceId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const newIds = [...(group.serviceIds || []), serviceId];
    try {
      await updateGroup(groupId, { serviceIds: newIds });
      onGroupsChange();
    } catch (err) {
      console.error('Failed to update group', err);
    }
  };

  const handleRemoveServiceFromGroup = async (groupId, serviceId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const newIds = (group.serviceIds || []).filter(id => id !== serviceId);
    try {
      await updateGroup(groupId, { serviceIds: newIds });
      onGroupsChange();
    } catch (err) {
      console.error('Failed to update group', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col ${
        isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-gray-200'
      }`}>
        
        {/* Header */}
        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-dark-border' : 'border-gray-100'}`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FolderOpen className="w-5 h-5 inline mr-2" />
              Manage Groups & Environments
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Organize microservices into logical groups for easier management.
            </p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Create New Group */}
          <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-900/50 border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Plus className="w-4 h-4 inline mr-1" /> Create New Group
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Production Env"
                  className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none transition-all ${
                    isDark ? 'bg-dark-bg border-dark-border text-white focus:border-emerald-accent' : 'bg-white border-gray-300 text-gray-900 focus:border-google-blue'
                  }`}
                />
              </div>
              <div>
                <label className={`text-xs font-bold mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Type</label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                  className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none appearance-none transition-all ${
                    isDark ? 'bg-dark-bg border-dark-border text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="environment">Environment</option>
                  <option value="project">Project Group</option>
                  <option value="team">Team</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Color picker */}
            <div className="mb-4">
              <label className={`text-xs font-bold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <Palette className="w-3 h-3 inline mr-1" /> Group Color
              </label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewGroupColor(c)}
                    className={`w-7 h-7 rounded-full transition-all border-2 ${
                      newGroupColor === c ? 'scale-110 border-white shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Service selection */}
            <div className="mb-4">
              <label className={`text-xs font-bold mb-2 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Select Services</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleServiceSelection(s.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left transition-all border ${
                      selectedServices.includes(s.id)
                        ? (isDark ? 'bg-emerald-accent/10 border-emerald-accent/40 text-white' : 'bg-google-blue/10 border-google-blue/40 text-gray-900')
                        : (isDark ? 'bg-gray-900 border-dark-border text-gray-400 hover:border-gray-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300')
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                      selectedServices.includes(s.id) 
                        ? (isDark ? 'bg-emerald-accent border-emerald-accent' : 'bg-google-blue border-google-blue')
                        : (isDark ? 'border-gray-600' : 'border-gray-300')
                    }`}>
                      {selectedServices.includes(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{getDisplayServiceName(s.microserviceName)}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isCreating}
              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-emerald-accent text-dark-bg hover:scale-[1.01]' : 'bg-google-blue text-white hover:scale-[1.01]'
              }`}
            >
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Group</>}
            </button>
          </div>

          {/* Existing Groups */}
          {groups.length > 0 && (
            <div>
              <h3 className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Existing Groups</h3>
              <div className="space-y-4">
                {groups.map(group => {
                  const groupServices = services.filter(s => group.serviceIds?.includes(s.id));
                  return (
                    <div key={group.id} className={`p-4 rounded-xl border transition-all ${
                      isDark ? 'bg-gray-900/50 border-dark-border' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ background: group.color || '#9ca3af' }}></div>
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{group.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'
                          }`}>{group.type}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {groupServices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {groupServices.map(s => (
                            <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                              isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                s.status === 'Operational' ? 'bg-emerald-accent' : s.status === 'Degraded' ? 'bg-amber-400' : 'bg-rose-accent'
                              }`}></div>
                              {getDisplayServiceName(s.microserviceName)}
                              <button 
                                onClick={() => handleRemoveServiceFromGroup(group.id, s.id)}
                                className="text-gray-400 hover:text-rose-500 ml-1"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No services assigned</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupManager;
