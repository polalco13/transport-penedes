'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { type AdminManagedAlert } from '@/lib/types'
import { Moon, Sun } from 'lucide-react'

export default function AdminPage() {
  const [horarisText, setHorarisText] = useState('') // This holds the string from Textarea
  const [rutesText, setRutesText] = useState('') // This holds the string from Textarea
  const [alerts, setAlerts] = useState<AdminManagedAlert[]>([])
  const [newAlertMessage, setNewAlertMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [alertManagementError, setAlertManagementError] = useState<string | null>(null);
  const [alertManagementStatus, setAlertManagementStatus] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true); // For dark mode

  useEffect(() => {
    // Dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addListener(handleChange);

    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Function to fetch all alerts (active and inactive) for admin
  const fetchAdminAlerts = useCallback(async () => {
    setAlertManagementError(null);
    setAlertManagementStatus("Carregant alertes...");
    try {
      const res = await fetch('/api/alerts?all=true');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Failed to fetch alerts: ${res.statusText}` }));
        throw new Error(errorData.message);
      }
      const data = await res.json();
      setAlerts(data);
      setAlertManagementStatus("Alertes carregades correctament.");
      return data;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error fetching alerts';
      setAlertManagementError(errorMsg);
      setAlertManagementStatus(null); // Clear status on error
      // setError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg); // Append to general error or set
      return [];
    }
  }, []);


  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSaveStatus(null)
    setAlertManagementError(null);
    setAlertManagementStatus(null);
    try {
      const horarisRes = await fetch('/api/schedules')
      if (!horarisRes.ok) throw new Error(`Failed to fetch schedules: ${horarisRes.statusText}`)
      const horarisData = await horarisRes.json()
      setHorarisText(JSON.stringify(horarisData, null, 2))

      const rutesRes = await fetch('/api/routes')
      if (!rutesRes.ok) throw new Error(`Failed to fetch routes: ${rutesRes.statusText}`)
      const rutesData = await rutesRes.json()
      setRutesText(JSON.stringify(rutesData, null, 2))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchAdminAlerts()
  }, [fetchData, fetchAdminAlerts])

  const handleAddAlert = async () => {
    if (!newAlertMessage.trim()) {
      setAlertManagementError('El mensaje de alerta no puede estar vacío.');
      return;
    }

    setAlertManagementError(null);
    setAlertManagementStatus('Agregando nueva alerta...');
    
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newAlertMessage.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to add alert: ${response.statusText}` }));
        throw new Error(errorData.message);
      }

      const newAlert = await response.json();
      setAlerts(prev => [...prev, newAlert]);
      setNewAlertMessage('');
      setAlertManagementStatus('Alerta agregada correctamente.');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido agregando alerta';
      setAlertManagementError(errorMsg);
      setAlertManagementStatus(null);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    setAlertManagementError(null);
    setAlertManagementStatus('Eliminando alerta...');
    
    try {
      const response = await fetch(`/api/alerts?id=${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to delete alert: ${response.statusText}` }));
        throw new Error(errorData.message);
      }

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      setAlertManagementStatus('Alerta eliminada correctamente.');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error desconocido eliminando alerta';
      setAlertManagementError(errorMsg);
      setAlertManagementStatus(null);
    }
  };

  const handleSaveChanges = async (dataType: 'schedules' | 'routes') => {
    setSaveStatus(`Saving ${dataType}...`)
    setError(null)
    try {
      let endpoint = ''
      let body = ''
      let dataToSave

      if (dataType === 'schedules') {
        endpoint = '/api/schedules'
        try {
          dataToSave = JSON.parse(horarisText)
          body = JSON.stringify(dataToSave)
        } catch (e) {
          throw new Error('Invalid JSON format for schedules.')
        }
      } else {
        endpoint = '/api/routes'
        try {
          dataToSave = JSON.parse(rutesText)
          body = JSON.stringify(dataToSave)
        } catch (e) {
          throw new Error('Invalid JSON format for routes.')
        }
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to save ${dataType}`)
      }
      setSaveStatus(`${dataType} saved successfully!`)

    } catch (e) {
      setError(e instanceof Error ? e.message : `An unknown error occurred while saving ${dataType}`)
      setSaveStatus(null)
    }
  }

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'} p-4`}>
      Carregant dades d&apos;administració...
    </div>
  )

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'} p-4`}>
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Admin - Timetable Management</h1>
          <Button onClick={toggleDarkMode} variant="ghost" size="icon" className={darkMode ? 'text-yellow-400' : 'text-gray-600'}>
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </Button>
        </div>

        <div className={`p-4 mb-6 rounded-lg ${darkMode ? 'bg-yellow-700 border-yellow-600 text-yellow-200' : 'bg-yellow-100 border-yellow-500 text-yellow-700'} border-l-4`} role="alert">
          <p className="font-bold">Important Note</p>
          <p>This admin panel directly modifies local JSON files. This method is suitable for local development or specific server setups.
          For serverless environments (like Vercel), file system writes may not persist. Consider a database for production deployments.</p>
        </div>

        {error && <div className={`p-4 mb-4 rounded ${darkMode ? 'bg-red-700 text-red-200 border-red-600' : 'bg-red-100 text-red-700 border-red-400'} border`} role="alert">{error}</div>}
        {saveStatus && <div className={`p-4 mb-4 rounded ${darkMode ? 'bg-green-700 text-green-200 border-green-600' : 'bg-green-100 text-green-700 border-green-400'} border`} role="alert">{saveStatus}</div>}

        <section className={`mb-8 p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Manage Schedules (horaris.json)</h2>
          <Textarea
            value={horarisText}
            onChange={(e) => setHorarisText(e.target.value)}
            rows={15}
            className={`w-full p-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400' : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'}`}
            placeholder="Enter schedules JSON here..."
          />
          <Button onClick={() => handleSaveChanges('schedules')} className={`mt-3 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
            Save Schedules
          </Button>
        </section>

        <section className={`mb-8 p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Manage Routes (rutes.json)</h2>
          <Textarea
            value={rutesText}
            onChange={(e) => setRutesText(e.target.value)}
            rows={15}
            className={`w-full p-2 border rounded font-mono text-sm ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400' : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'}`}
            placeholder="Enter routes JSON here..."
          />
          <Button onClick={() => handleSaveChanges('routes')} className={`mt-3 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
            Save Routes
          </Button>
        </section>

        <hr className={`my-8 ${darkMode ? 'border-gray-700' : 'border-gray-300'}`} />

        <section className={`p-6 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h2 className={`text-2xl font-semibold mb-3 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Manage Service Alerts</h2>
          {alertManagementError && <div className={`p-4 mb-4 rounded ${darkMode ? 'bg-red-800 text-red-200 border-red-700' : 'bg-red-100 text-red-700 border-red-400'} border`} role="alert">{alertManagementError}</div>}
          {alertManagementStatus && <div className={`p-4 mb-4 rounded ${darkMode ? 'bg-blue-800 text-blue-200 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-400'} border`} role="alert">{alertManagementStatus}</div>}

          <div className="mb-4">
            <h3 className={`text-xl font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Add New Alert</h3>
            <Textarea
              value={newAlertMessage}
              onChange={(e) => setNewAlertMessage(e.target.value)}
              rows={3}
              className={`w-full p-2 border rounded font-mono text-sm mb-2 ${darkMode ? 'bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400' : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500'}`}
              placeholder="Enter new alert message..."
            />
            <Button onClick={handleAddAlert} className={`${darkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'} text-white`}>Add Alert</Button>
          </div>

          <div>
            <h3 className={`text-xl font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Current Alerts</h3>
            {alerts.length === 0 ? (
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No service alerts at the moment.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map(alert => (
                  <li key={alert.id} className={`p-3 rounded border ${darkMode ? (alert.active ? 'border-yellow-600 bg-gray-750' : 'border-gray-600 bg-gray-750') : (alert.active ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-gray-50')}`}>
                    <p className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{alert.message}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ID: {alert.id} | Created: {new Date(alert.createdAt).toLocaleString()}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status: {alert.active ? 'Active' : 'Inactive'}</p>
                    <Button onClick={() => handleDeleteAlert(alert.id)} variant="destructive" size="sm" className="mt-2">
                      Delete Alert
                    </Button>
                    {/* TODO: Add button to toggle active status if needed */}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <Button onClick={fetchData} variant="outline" className={`mt-8 ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-200'}`}>Refresh All Data</Button>
      </div>
    </div>
  )
}
