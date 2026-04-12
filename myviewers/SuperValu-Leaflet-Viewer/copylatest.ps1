$source = 'C:\Users\corki\Documents\website\browny-v1.0\SuperValu-Leaflet-Viewer'
$dest   = 'C:\Users\corki\Documents\GitHub\corkiejp.github.io\myviewers\SuperValu-Leaflet-Viewer'

robocopy $source $dest /E /XO /XC /FFT /Z /R:1 /W:1

Read-Host 'Done. Press Enter to close'