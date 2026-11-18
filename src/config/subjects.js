// National AI Lab — fanlar (yuqoridagi panel). models — shu fanga tegishli 3D modellar.
export const SUBJECTS = [
  { id: 'kimyo',       label: 'Kimyo laboratoriyasi',     short: 'Kimyo',       icon: '⚗️', models: ['chemistry_reaction_lab'] },
  { id: 'fizika',      label: 'Fizika',                   short: 'Fizika',      icon: '⚡' },
  { id: 'mudofaa',     label: 'Mudofaa texnikalari',      short: 'Mudofaa',     icon: '🛡️', models: ['gun_m4a1', 'helicopter_ah64', 'jet_fighter'] },
  { id: 'arxitektura', label: 'Arxitektura',              short: 'Arxitektura', icon: '🏛️' },
  { id: 'transport',   label: 'Transport texnikalari',    short: 'Transport',   icon: '🚆', models: ['v8_engine'] },
  { id: 'dron',        label: 'Dronlar',                  short: 'Dronlar',     icon: '🛸', models: ['tactical_drone', 'fixed_wing_uav'] },
  { id: 'bojxona',     label: 'Bojxona rasmiylashtiruvi', short: 'Bojxona',     icon: '🛃' },
];
export const subjectOfModel = (id) => (SUBJECTS.find(s => s.models && s.models.includes(id)) || {}).id || null;
