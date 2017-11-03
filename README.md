# [Shinka] AJAX Paging
Replaces pagination links with AJAX calls.

## Installation
* Download the [latest stable release](https://github.com/kalynrobinson/xf2_ajax_paging/releases)
* Extract the zip
* Copy the contents of the `upload` folder to the root of your Xenforo installation
* Install and activate the add-on in your Admin CP
 
## Features
* Changing pages (e.g. inside a thread) no longer reloads the page
[alt text](https://github.com/kalynrobinson/xf2_ajax_paging/raw/master/docs/images/ajax.gif "Paging")
 
## Development
### Setup
* Clone or fork the repository
* Create a symbolic link for the AjaxPaging folder in your XF2 installation to the one in the repository directory, e.g.
```
> mklink /D "C:/Fake User/My Site/src/addons/Shinka/AjaxPaging" "C:/Fake User/Dev/xf2_ajax_paging/upload/src/addons/Shinka/AjaxPaging"
```
 Import development output by executing 
```
> php cmd.php xf-dev:import --addon Shinka/AjaxPaging
```
### Build for Release
* Bump up the version using [Xenforo's recommended version ID format](https://xf2demo.xenforo.com/dev-docs/add-on-structure/#recommended-version-id-format) and then build
```
> php cmd.php xf-addon:bump-version Shinka/AjaxPaging --version-id [version_id] --version-string [version_string]
> php cmd.php xf-addon:build-release Shinka/AjaxPaging
```
### Technical
* Uses a custom XF handler that pigeons code and logic from XFAjaxSubmit
* My JavaScript is terrible, don't emulate me