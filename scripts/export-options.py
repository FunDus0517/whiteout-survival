import plistlib
import sys
from pathlib import Path
team, profile, target = sys.argv[1:]
data = {'method':'ad-hoc','teamID':team,'signingStyle':'manual','signingCertificate':'Apple Distribution','provisioningProfiles':{'com.fundus0517.whiteout':profile},'stripSwiftSymbols':True}
Path(target).parent.mkdir(parents=True,exist_ok=True)
with open(target,'wb') as output:
    plistlib.dump(data,output)
