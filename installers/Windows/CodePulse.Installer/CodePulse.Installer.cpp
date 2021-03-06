// Copyright 2018 Secure Decisions, a division of Applied Visions, Inc. 
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// This material is based on research sponsored by the Department of Homeland
// Security (DHS) Science and Technology Directorate, Cyber Security Division
// (DHS S&T/CSD) via contract number HHSP233201600058C.

#include "stdafx.h"
#include <sstream>

std::wstring& AppendBackslash(std::wstring& path)
{
	if (path.compare(path.length() - 1, 1, L"\\") != 0)
	{
		path.append(L"\\");
	}
	return path;
}

UINT CountFolderItems(const std::wstring& folderPath)
{
	auto searchPath = std::wstring(folderPath);
	AppendBackslash(searchPath).append(L"*");

	WIN32_FIND_DATA findFileData;
	const auto handle = ::FindFirstFile(searchPath.c_str(), &findFileData);
	if (handle == INVALID_HANDLE_VALUE)
	{
		return 0;
	}

	UINT count = 0;
	do
	{
		const auto file = std::wstring(findFileData.cFileName);
		if (file != L"." && file != L"..")
		{
			count++;
		}
	} while (::FindNextFile(handle, &findFileData));

	::FindClose(handle);

	return count;
}

UINT __stdcall ValidateCodePulseInstallFolder(MSIHANDLE hInstall)
{
	auto hr = WcaInitialize(hInstall, "ValidateCodePulseInstallFolder");
	if (FAILED(hr)) {
		ExitTrace(hr, "WcaInitialize returned a failure HRESULT");  
		return WcaFinalize(ERROR_INSTALL_FAILURE);
	}
	WcaLog(LOGMSG_STANDARD, "ValidateCodePulseInstallFolder has initialized.");

	LPWSTR customActionData;
	WcaGetProperty(TEXT("CustomActionData"), &customActionData);

	char path[MAX_PATH];
	size_t bytesConverted;
	wcstombs_s(&bytesConverted, path, MAX_PATH, customActionData, wcslen(customActionData));
	WcaLog(LOGMSG_STANDARD, path);

	auto installPath = std::wstring(customActionData);
	AppendBackslash(installPath);

	const auto appItemCount = CountFolderItems(installPath + L"app");
	const auto backendItemCount = CountFolderItems(installPath + L"backend");
	const auto jreItemCount = CountFolderItems(installPath + L"jre");
	const auto localesItemCount = CountFolderItems(installPath + L"locales");

	const auto itemCount = appItemCount + backendItemCount + jreItemCount + localesItemCount;
	if (itemCount != 0)
	{
		std::wstringstream userMessage;
		userMessage << L"Code Pulse cannot be installed in the '"
			<< customActionData
			<< L"' folder because it may contain content from a previous Code Pulse version. "
			<< L"Remove the prior version before continuing or install Code Pulse in another folder."
			<< std::ends;

		const auto hRecord = MsiCreateRecord(0);
		WcaSetRecordString(hRecord, 0, userMessage.str().c_str());
		WcaProcessMessage(INSTALLMESSAGE(INSTALLMESSAGE_USER + MB_OK), hRecord);
		MsiCloseHandle(hRecord);
	}

	ReleaseStr(customActionData);

	return WcaFinalize(itemCount == 0 ? ERROR_SUCCESS : ERROR_INSTALL_FAILURE);
}
