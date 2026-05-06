/*
 * Proprietary (c) Ryan Walsh / Walsh Tech Group
 * All rights reserved. Professional preview only.
 */

import { useState } from 'react'
import AppShell from '../shell/AppShell'
import { Card } from '@mui/material'

const DATA_SOURCES = [
    { id: 'nasa_power', name: 'NASA POWER', type: 'Weather', provider: 'NASA', coverage: '1984-Present', variables: ['GHI', 'DNI', 'Temp', 'Wind'], status: 'CONNECTED', records: 12847000 },
    { id: 'open_meteo', name: 'Open-Meteo Archive', type: 'Weather', provider: 'Open-Meteo', coverage: '1950-Present', variables: ['Precip', 'Temp', 'Wind', 'Radiation'], status: 'CONNECTED', records: 8234000 },
    { id: 'pvdaq', name: 'NREL PVDAQ', type: 'PV Systems', provider: 'NREL', coverage: '2012-Present', variables: ['AC Power', 'DC Power', 'Irradiance', 'Temp'], status: 'CONNECTED', records: 184201 },
    { id: 'entsoe', name: 'ENTSO-E Transparency', type: 'Grid', provider: 'ENTSO-E', coverage: '2015-Present', variables: ['Generation', 'Load', 'Frequency'], status: 'AUTH_REQUIRED', records: 5642000 },
    { id: 'nrel_wind', name: 'NREL Wind Toolkit', type: 'Wind', provider: 'NREL', coverage: '2007-2013', variables: ['Wind Speed', 'Direction', 'Power Density'], status: 'CACHED', records: 3847000 },
]

export default function SourcesPage() {
  const [selectedSource, setSelectedSource] = useState(DATA_SOURCES[0])

  const stats = [
    { label: 'Total Sources', value: `${DATA_SOURCES.length}`, unit: '' },
    { label: 'No Auth Required', value: `${DATA_SOURCES.filter(s => s.status === 'CONNECTED' || s.status === 'CACHED').length}`, unit: '' },
    { label: 'Auth Required', value: `${DATA_SOURCES.filter(s => s.status === 'AUTH_REQUIRED').length}`, unit: '' },
    { label: 'Cached / Local', value: `${DATA_SOURCES.filter(s => s.status === 'CACHED').length}`, unit: '' },
  ]

  return (
    <AppShell title="Plants">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        {stats.map((s) => (
          <Card key={s.label} className="gp-card" sx={{ p: 1.5 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5f7688', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#e6f4ff', lineHeight: 1 }}>{s.value}</div>
            {s.unit && <div style={{ fontSize: '0.75rem', color: '#91a8b8', marginTop: '0.25rem' }}>{s.unit}</div>}
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px' }}>
        <Card className="gp-card" sx={{ p: 1.5 }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', fontWeight: 700, color: '#e6f4ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DATA SOURCES</h3>
          <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(96,190,255,0.15)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: '#91a8b8', fontWeight: 600, textTransform: 'uppercase' }}>Source</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#91a8b8', fontWeight: 600, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#91a8b8', fontWeight: 600, textTransform: 'uppercase' }}>Records</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#91a8b8', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map((source) => (
                  <tr key={source.id} onClick={() => setSelectedSource(source)} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selectedSource.id === source.id ? 'rgba(40,191,255,0.1)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem', color: '#e6f4ff', fontWeight: selectedSource.id === source.id ? 600 : 400 }}>{source.name}</td>
                    <td style={{ textAlign: 'center', padding: '0.5rem', color: '#91a8b8', fontSize: '0.7rem' }}>{source.type}</td>
                    <td style={{ textAlign: 'center', padding: '0.5rem', color: '#28bfff', fontSize: '0.7rem' }}>{(source.records / 1000000).toFixed(1)}M</td>
                    <td style={{ textAlign: 'center', padding: '0.5rem', color: source.status === 'ACTIVE' ? '#66d36e' : '#ffc933', fontWeight: 600, fontSize: '0.7rem' }}>{source.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="gp-card" sx={{ p: 1.5 }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#91a8b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SOURCE DETAILS</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Name</div>
              <div style={{ fontSize: '0.875rem', color: '#e6f4ff', fontWeight: 600 }}>{selectedSource.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Provider</div>
              <div style={{ fontSize: '0.875rem', color: '#28bfff' }}>{selectedSource.provider}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Type</div>
              <div style={{ fontSize: '0.875rem', color: '#91a8b8' }}>{selectedSource.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Coverage</div>
              <div style={{ fontSize: '0.75rem', color: '#91a8b8' }}>{selectedSource.coverage}</div>
            </div>
            <div style={{ borderTop: '1px solid rgba(96,190,255,0.15)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Variables</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {selectedSource.variables.map((v) => (
                  <span key={v} style={{ fontSize: '0.65rem', background: 'rgba(40,191,255,0.15)', color: '#28bfff', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(40,191,255,0.3)' }}>{v}</span>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(96,190,255,0.15)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#5f7688', textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '0.875rem', color: selectedSource.status === 'ACTIVE' ? '#66d36e' : '#ffc933', fontWeight: 600 }}>{selectedSource.status}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
