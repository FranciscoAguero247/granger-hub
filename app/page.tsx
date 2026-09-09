'use client';

import { useState } from 'react';

// --- CONFIGURATION CONSTANTS ---
const WARD_CONFIG = {
  wardName: 'Granger YSA Ward',
  stakeName: 'Taylorsville Utah YSA Stake',
  buildingAddress: '3120 W 4700 S, Salt Lake City, UT 84118',
  mapsUrl: 'https://maps.google.com/?q=3120+W+4700+S,+Salt+Lake+City,+UT+84118',
  schedule: {
    sacramentTime: '12:00 PM',
    secondHourTime: '1:10 PM',
    location: 'Stake Center Chapel',
  },
  links: {
    // Official Facebook Group URL (Triggers native FB App on mobile)
    facebookGroup: 'https://www.facebook.com/groups/YOUR_FACEBOOK_GROUP_ID',
    // WhatsApp Invite URL
    whatsappGroup: 'https://chat.whatsapp.com/YOUR_WHATSAPP_INVITE_CODE',
  },
  leadership: [
    {
      name: 'Bishopric',
      role: 'Ward Leadership',
      fbHandle: 'trisha.peck.959148', // Replace with relevant leadership profile handle/ID
    },
    {
      name: 'Relief Society',
      role: 'Presidency',
      fbHandle: '', // Optional Messenger handle
    },
  ],
};

export default function GrangerLauncher() {
  const [showPwaModal, setShowPwaModal] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Header Block */}
        <div className="bg-indigo-600 text-white p-6 text-center relative">
          <span className="text-[10px] font-black tracking-widest uppercase bg-indigo-500 text-indigo-100 px-2.5 py-1 rounded-full border border-indigo-400">
            {WARD_CONFIG.stakeName}
          </span>
          <h1 className="text-2xl font-black mt-3 tracking-tight">{WARD_CONFIG.wardName}</h1>
          <p className="text-xs text-indigo-100 mt-1">Official Communications & Logistics</p>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Sunday Logistics Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sunday Schedule</h2>
            <div className="mt-2 flex justify-between items-center text-sm font-bold text-slate-800">
              <span>Sacrament Meeting</span>
              <span className="text-indigo-600">{WARD_CONFIG.schedule.sacramentTime}</span>
            </div>
            <div className="mt-1 flex justify-between items-center text-xs text-slate-600 border-t border-slate-200/60 pt-2">
              <span>EQ & Relief Society</span>
              <span className="font-semibold">{WARD_CONFIG.schedule.secondHourTime}</span>
            </div>
            <a
              href={WARD_CONFIG.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
            >
              <span>📍 {WARD_CONFIG.schedule.location}</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>

          {/* Core App Launchers */}
          <div className="space-y-2.5 pt-1">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Channels</h2>
            
            {/* Facebook Group Button */}
            <a
              href={WARD_CONFIG.links.facebookGroup}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full h-14 px-4 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook Group</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">Open App ↗</span>
            </a>

            {/* WhatsApp Group Button */}
            <a
              href={WARD_CONFIG.links.whatsappGroup}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full h-14 px-4 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-sm transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                </svg>
                <span>WhatsApp Group</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">Join ↗</span>
            </a>
          </div>

          {/* Quick Messenger Triggers */}
          <div className="pt-2 border-t border-slate-100">
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Direct Contact</h2>
            <div className="grid grid-cols-2 gap-2">
              {WARD_CONFIG.leadership.map((leader, idx) => (
                <a
                  key={idx}
                  href={leader.fbHandle ? `https://m.me/${leader.fbHandle}` : WARD_CONFIG.links.facebookGroup}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center block hover:bg-slate-100 transition"
                >
                  <p className="text-xs font-bold text-slate-800">{leader.name}</p>
                  <p className="text-[10px] text-indigo-600 font-medium">{leader.role}</p>
                </a>
              ))}
            </div>
          </div>

          {/* Bookmark Prompt Button */}
          <button
            onClick={() => setShowPwaModal(true)}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <span>📱 Add to Home Screen</span>
          </button>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Granger YSA • Zero Sign-up Web Hub
        </div>
      </div>

      {/* PWA Onboarding Modal */}
      {showPwaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Add to Phone Home Screen</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Save this page as a web app icon on your phone so you can launch Facebook and WhatsApp in 1 tap:
            </p>
            <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-2 text-slate-700">
              <p><strong>iPhone (Safari):</strong> Tap <span className="text-indigo-600">Share ⎋</span> → Select <strong>Add to Home Screen ➕</strong></p>
              <p><strong>Android (Chrome):</strong> Tap <span className="text-indigo-600">More ⋮</span> → Select <strong>Add to Home screen</strong></p>
            </div>
            <button
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}