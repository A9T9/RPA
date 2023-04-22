###########################################################################
#This script shows how to run a macro "forever" 
# by checking on the command line return value
# and killing/restarting Chrome if needed
###########################################################################



function PlayAndWait ([string]$macro)
{
$timeout_seconds = 60 #max time in seconds allowed for macro to complete. Change this value if  your macros takes longer to run.
$path_downloaddir = "c:\test\" #Where the script finds the RPA log files =>Without XModules THIS MUST BE THE BROWSER DOWNLOAD FOLDER*, as specified in the browser settings. With XModules installed, the &savelog= command line parameter can also take a full path (recommended). It is faster with a full path, and then there is no need to change the browser download directory.
$path_autorun_html = "c:/test/ui.vision.html" #autorun page exported from API setttings page.

#Optional: Kill Chrome instances (if any open)
#taskkill /F /IM chrome.exe /T 

#Create log file. Here the RPA software will store the result of the macro run
$log = "log_" + $(get-date -f MM-dd-yyyy_HH_mm_ss) + ".txt" 
$path_log = $path_downloaddir + $log 

#Build command line (1=CHROME, 2=FIREFOX, 3=EDGE)
$browser = 3
Switch ($browser) {
1 {$cmd = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"; break}
2 {$cmd = "${env:ProgramFiles}\Mozilla Firefox\firefox.exe"; break} #For FIREFOX
3 {$cmd = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"; break} #For EDGE 
}

$arg = """file:///"+ $path_autorun_html + "?macro="+ $macro + "&direct=1&closeRPA=1&closeBrowser=1&savelog="+$log+""""

Start-Process -FilePath $cmd -ArgumentList $arg #Launch the browser and run the macro

#############Wait for macro to complete => Wait for log file to appear in download folder
$status_runtime = 0
Write-Host  "Log file will show up at " + $path_log
while (!(Test-Path $path_log) -and ($status_runtime -lt $timeout_seconds)) 
{ 
    Write-Host  "Waiting for macro to finish, seconds=" $status_runtime
    Start-Sleep 1
    $status_runtime = $status_runtime + 1 
}


#Macro done - or timeout exceeded:
if ($status_runtime -lt $timeout_seconds)
{
    #Read FIRST line of log file, which contains the status of the last run
    $status_text = Get-Content $path_log -First 1


    #Check if macro completed OK or not
    $status_int = -1     
    If ($status_text -contains "Status=OK") {$status_int = 1}

}
else
{
    $status_text =  "Macro did not complete within the time given:" + $timeout_seconds
    $status_int = -2
}

remove-item $path_log #clean up
return $status_int, $status_text, $status_runtime
}


###########################################################################
#        Main program starts here
###########################################################################

$testreport = "c:\test\testreport.txt"


For ($i=0; $i -le 1; $i++) {

Write-Host "Loop Number:" $i

$result = PlayAndWait Demo/Core/DemoFrames  #run the macro


$errortext = $result[1] #Get error text or OK
$runtime = $result[2] #Get runtime
$report = "Loop:" + $i + " Return code: " + $result[0]+ " Macro runtime: "+$runtime+" seconds, Result: "+ $errortext
Write-Host $report
Add-content $testreport -value ($report)

#Check that all is ok, if not kill Chrome to clear memory etc

if ($result[0] -ne 1)
    {
        #Cleanup => Kill Chrome instance 
        #We could also kill Chrome after each loop (then no IF statement needed)
        taskkill /F /IM chrome.exe /T   
        $report = "Loop:" + $i + " Chrome closed"
        Add-content $testreport -value ($report)
    }

}

