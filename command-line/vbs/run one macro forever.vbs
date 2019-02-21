Option Explicit

	'	set here what browser to use
Const Use_Chrome = 0	'	1 means to use Chrome    0 means to use firefox

	'	set this path to report txt file
Const testreport = "d:\test\testreport.txt"

	'	 max time in seconds allowed for macro to complete (change this value if  your macros takes longer to run)
Const timeout_seconds = 60	

Const ForReading = 1, ForWriting = 2, ForAppending = 8
Const TristateUseDefault = -2, TristateTrue = -1, TristateFalse = 0

Dim objFSO , Log_File
Dim i
Dim result , errortext , runtime , report

'		---------  start of script

Set objFSO = CreateObject("Scripting.FileSystemObject")

If objFSO.FileExists( testreport ) Then objFSO.deletefile testreport , true

'  open log file
Set Log_File = objFSO.OpenTextFile( testreport , ForAppending , True )


For i = 0 To 1

    report = "Loop: " & i & " START"
    	Log_File.WriteLine report

    	'	Write-Host "Loop Number:" $i
    result = PlayAndWait( "DemoFrames" ) 	'	  #run the macro

    errortext = result(1)	'	 #Get error text or OK
    runtime   = result(2)	'	 #Get runtime
    report    = "Loop: " & i & " Return code: " & result(0) & " Macro runtime: " & runtime & " seconds, Result: " & errortext
    
    Log_File.WriteLine report
    
    	'	Check that all is ok, if not kill Chrome to clear memory etc
    if result(0) <> 1 then

	        '	Cleanup => Kill Chrome or FIREFOX instance 

        Call Kill_Browser
         
        report = "Loop: " & i & " Chrome closed"
	        Log_File.WriteLine report
	        	'Add-content $testreport -value ($report)
        	
    End If
    
         '  WAIT  1 SEC  Start-Sleep 1
    Call WScript.Sleep(3000)	'	1000 millsec = 1 sec

Next

'		---------  start of script

Log_File.Close
Set Log_File = Nothing
Set objFSO = Nothing 

'MsgBox "DONE"



'		---------  functions STARTS here

function PlayAndWait (macro)

	Dim arr_return(2) 
	Dim path_downloaddir , path_autorun_html
	Dim log_str , path_log
	Dim cmd , arg
	Dim status_runtime , status_text , status_int
	Dim rep_stat
	Dim oShell , str_cmd , int_ret , oExec

		'	timeout set it on top of the script
    	'	timeout_seconds = 60 #max time in seconds allowed for macro to complete (change this value if  your macros takes longer to run)
    
    path_downloaddir  = "D:\test\" 	'	#where the kantu log file is stored ("downloaded") - *THIS MUST BE THE BROWSER DOWNLOAD FOLDER* (= what is specified in the browser settings)
	
    path_autorun_html = "D:\test\dc.html" 'the autorun page as exported by Kantu. A page for any macro will do, as we use the &macro= switch anyway.


    	'	IF YOU WANT TO KILL browser , uncomment next line
    'Call Kill_Browser

    	'	#Create log file. Here Kantu will store the result of the macro run
    log_str = "log_" & get_date_stamp & ".txt" 
    'log_str = "log_02-15-2019_19_39_30.txt"
    
    path_log = path_downloaddir & log_str
    
    rep_stat =  "Log file will show up at : "  & path_log
    	Log_File.WriteLine rep_stat
    
    
    path_autorun_html = "file:///" & Replace(path_autorun_html , "\" , "/" )

	If Use_Chrome = 1 Then
	
	    	'	Build command line
	    cmd = Chr(34) & "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" & Chr(34) & " -- "

   	Else
   	
 	    	'	Build command line
	    cmd = Chr(34) & "C:\Program Files\Mozilla Firefox\firefox.exe" & Chr(34) & " "

   	End IF 	
    
    	'	set arguments
    arg = Chr(34) & path_autorun_html & "?macro=" & macro & "&direct=1&savelog=" & log_str & Chr(34)
    	'Log_File.WriteLine arg

    	'	Start-Process -FilePath $cmd -ArgumentList $arg #Launch the browser and run the macro
	Set oShell = WScript.CreateObject ("WScript.Shell")
	
	str_cmd = cmd & " " & arg
		Log_File.WriteLine str_cmd
	
	'int_ret = oShell.Run( str_cmd , 1 , False )
	'	Log_File.WriteLine "oShell.Run " & time
	
	
	Set oExec = oShell.Exec( str_cmd )

	'Do While oExec.Status = 0
	'     WScript.Sleep 100
	'Loop
	
	Log_File.WriteLine oExec.Status & " oShell.Exec " & time

	Set oExec = Nothing 
	Set oShell = Nothing
	
	
    '	Wait for macro to complete => Wait for log file to appear in download folder
    status_runtime = 0

    Do While status_runtime < timeout_seconds 

        rep_stat =  "	Waiting for macro to finish, seconds= " & status_runtime
        	Log_File.WriteLine rep_stat
        
        	'  WAIT  1 SEC  Start-Sleep 1
        Call WScript.Sleep(1000)	'	1000 millsec = 1 sec
        
        If objFSO.FileExists( path_log ) Then Exit DO
        
        status_runtime = status_runtime + 1 
        
    Loop
    

    		'	Macro done - or timeout exceeded:
    if status_runtime < timeout_seconds then

        '	Read FIRST line of log file, which contains the status of the last run
        '		$status_text = Get-Content $path_log -First 1
        
        status_text = objFSO.OpenTextFile( path_log , ForReading , False ).readline
        	'Log_File.WriteLine status_text

        	'	Check if macro completed OK or not
        status_int = -1     
        
        	'	If ($status_text -contains "Status=OK") {$status_int = 1}
        If InStr( status_text , "Status=OK" ) > 0 Then status_int = 1
        
    Else 

        status_text =  "Macro did not complete within the time given:" & timeout_seconds
        status_int = -2
         
    End If 

    	'	remove-item $path_log #clean up
    If objFSO.fileexists( path_log ) Then objFSO.deletefile path_log , true
    
    	'	return $status_int, $status_text, $status_runtime
    arr_return(0) = status_int
    arr_return(1) = status_text
    arr_return(2) = status_runtime
    
    PlayAndWait = arr_return

End Function 


Function get_date_stamp

	'	returns $(get-date -f MM-dd-yyyy_HH_mm_ss) + ".txt"   02-15-2019_18_43_01
	
	Dim d1 , yyyy , mm , dd , hh , min , ss , str_0 , str_1
	
	str_0 = "mm-dd-yyyy_hh_min_ss"
	d1 = Now
	
	yyyy = Year(d1)
	mm = zero_pad(month(d1))
	dd = zero_pad(day(d1))
	hh = zero_pad(hour(d1))
	min = zero_pad(minute(d1))
	ss = zero_pad(second(d1))
	
	str_1 = Replace(str_0 , "mm" , mm)
	str_1 = Replace(str_1 , "dd" , dd)
	str_1 = Replace(str_1 , "yyyy" , yyyy)
	str_1 = Replace(str_1 , "min" , min)
	str_1 = Replace(str_1 , "hh" , hh)
	str_1 = Replace(str_1 , "ss" , ss)

	get_date_stamp = str_1

End function


Function zero_pad(x)
	'	pads with 0

	If Len(x) = 1 Then x = 0 & x
	zero_pad = x

End Function


Function expand_env( env_name )

	Dim str_ret , oShell

	Set oShell = CreateObject("WScript.Shell")
	'WScript.Echo oShell.ExpandEnvironmentStrings("%PROGRAMFILES%")
	'WScript.Echo oShell.ExpandEnvironmentStrings("%PROGRAMFILES(x86)%")
	
	str_ret = oShell.ExpandEnvironmentStrings( env_name )
	
	Set oShell = Nothing
	
	expand_env = str_ret

End Function


Function Kill_Browser

		'	if you want to kill firefox , use  firefox.exe

	Dim ret_string , str_cmd
	Dim oShell
	
	Set oShell = WScript.CreateObject ("WScript.Shell")
	
	If Use_Chrome = 1 Then 
	
		str_cmd = "taskkill /F /IM chrome.exe /T"
	
	Else
	
		str_cmd = "taskkill /F /IM firefox.exe /T"
	
	End if
	
	oShell.run "cmd /C " & str_cmd , 0 , False 

	Set oShell = Nothing
	
End function