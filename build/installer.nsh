!macro customInit
	!insertmacro customPreinstall
!macroend

 !macro customPreinstall
   !if /FileExists "C:\Program Files (x86)\PlayStationDiscord\unins000.exe"
  	ExecWait '"C:\Program Files (x86)\PlayStationDiscord\unins000.exe" /verysilent'
  !endif  
  !if /FileExists "C:\Program Files\PlayStationDiscord\unins000.exe"
  	ExecWait '"C:\Program Files\PlayStationDiscord\unins000.exe" /verysilent'
  !endif 
!macroend