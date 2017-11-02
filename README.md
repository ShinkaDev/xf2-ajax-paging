# [Shinka] AJAX Paging
Replaces pagination links with AJAX calls.

## Installation
 * Download the [latest stable release](https://github.com/kalynrobinson/xf2_ajax_paging/releases)
 * Extract the zip
 * Copy the contents of the `upload` folder to the root of your Xenforo installation
 * Install and activate the add-on in your Admin CP
 
 ## Features
 * Changing pages (e.g. inside a thread) no longer reloads the page
 
 ## Development
 * Clone or fork the repository
 * Create a symbolic link for the AjaxPaging folder in your XF2 installation to the one in the repository directory, e.g.
 ```
 > mklink /D "C:/Fake User/My Site/src/addons/Shinka/AjaxPaging" "C:/Fake User/Dev/xf2_ajax_paging/upload/src/addons/Shinka/AjaxPaging"
 ```
 * Import development output by executing 
 ```
 > php cmd.php xf-dev:import --addon Shinka/AjaxPaging
 ```

## Technical
* Uses a custom XF handler that pigeons code and logic from XFAjaxSubmit
