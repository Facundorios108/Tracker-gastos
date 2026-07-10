import re

# Fix Profile.tsx
with open('src/pages/Profile.tsx', 'r') as f:
    profile_content = f.read()

profile_content = re.sub(
    r'settings\.creditCards\.map\(\(c: any\) => \(',
    r'(settings?.creditCards || []).map((c: any) => (',
    profile_content
)

with open('src/pages/Profile.tsx', 'w') as f:
    f.write(profile_content)

# Fix Cards.tsx
with open('src/pages/Cards.tsx', 'r') as f:
    cards_content = f.read()
    
cards_content = cards_content.replace('import { CreditCard as CreditCardIcon, ChevronLeft, Calendar } from \'lucide-react\';', 'import { CreditCard as CreditCardIcon, ChevronLeft } from \'lucide-react\';')
cards_content = cards_content.replace('Calendar', '') # just in case
cards_content = cards_content.replace('import { CreditCard as CreditCardIcon, ChevronLeft,  } from \'lucide-react\';', 'import { CreditCard as CreditCardIcon, ChevronLeft } from \'lucide-react\';')

with open('src/pages/Cards.tsx', 'w') as f:
    f.write(cards_content)

# Fix Login.tsx
with open('src/pages/Login.tsx', 'r') as f:
    login_content = f.read()
    
login_content = login_content.replace('import { Mail, Lock, ChevronRight, Wallet } from \'lucide-react\';', 'import { Mail, Lock, ChevronRight } from \'lucide-react\';')

with open('src/pages/Login.tsx', 'w') as f:
    f.write(login_content)

