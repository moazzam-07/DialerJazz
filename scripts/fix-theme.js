const fs = require('fs');


function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // text colors
  content = content.replace(/text-black/g, 'text-background');
  content = content.replace(/bg-emerald-500(\/[0-9]+)?/g, (match, opac) => opac ? `bg-foreground${opac}` : 'bg-foreground');
  content = content.replace(/bg-emerald-400/g, 'bg-foreground/90');
  content = content.replace(/text-emerald-500/g, 'text-foreground');
  content = content.replace(/text-emerald-400/g, 'text-muted-foreground');
  content = content.replace(/border-emerald-500(\/[0-9]+)?/g, (match, opac) => opac ? `border-foreground${opac}` : 'border-foreground');
  content = content.replace(/border-emerald-400/g, 'border-foreground/80');
  content = content.replace(/ring-emerald-500(\/[0-9]+)?/g, (match, opac) => opac ? `ring-foreground${opac}` : 'ring-foreground');
  content = content.replace(/shadow-emerald-500(\/[0-9]+)?/g, (match, opac) => opac ? `shadow-foreground${opac}` : 'shadow-sm');
  content = content.replace(/shadow-\[0_0_[0-9]+px_rgba\(16,185,129,0\.[0-9]+\)\]/g, 'shadow-lg');

  // specific overrides based on my prior grep
  content = content.replace(/border-primary/g, 'border-foreground/20');
  content = content.replace(/bg-primary(\/[0-9]+)?/g, (match, opac) => opac ? `bg-foreground${opac}` : 'bg-foreground');
  content = content.replace(/text-primary-foreground/g, 'text-background');
  content = content.replace(/text-primary/g, 'text-foreground');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log("Fixed:", file);
  }
}

const files = ['client/src/pages/Dashboard.tsx', 'client/src/components/InCallHUD.tsx', 'client/src/components/HeldCallBubble.tsx', 'client/src/components/AnimatedSelect.tsx', 'client/src/App.tsx',
  'client/src/components/CreateCampaignModal.tsx',
  'client/src/pages/ManualDialerPage.tsx',
  'client/src/components/ui/dialer-mode-select.tsx',
  'client/src/components/CallControls.tsx',
  'client/src/pages/LoginPage.tsx',
  'client/src/components/ui/button.tsx',
  'client/src/components/ui/checkbox.tsx',
  'client/src/components/ProtectedRoute.tsx'
];

files.forEach(fixFile);
