#jQuery Image Annotation Plugin

A jQuery Image Annotation plugin that can create Flickr-like comments on images embedded in web pages.

This plugin works with jQuery ~1.8.1.

Extract [this zip file] [7] into a directory on your web server and navigate to `demo-static.html` or view a [live preview][1].

###Usage:

To use the plugin you first need to reference the jQuery and jQuery UI libraries in your page. Add 
the `jquery.annotate.js` and `annotation.css` files to enable the plugin.

	<style type="text/css" media="all">@import "css/annotation.css";</style>
	<script type="text/javascript" src="dist/js/jquery.min.js"></script>
	<script type="text/javascript" src="dist/js/jquery-ui.min.js"></script>
	<script type="text/javascript" src="js/jquery.annotate.js"></script>

Once you've added in the necessary scripts, hook up an image on the page by using the following syntax:

	<script language="javascript">
	  $(window).load(function() {
	    $("#toAnnotate").annotateImage({
	      editable: true,
	      useAjax: false,
	      notes: [ { "top": 286, 
	                 "left": 161, 
	                 "width": 52, 
	                 "height": 37, 
	                 "text": "Small people on the steps", 
	                 "id": "e69213d0-2eef-40fa-a04b-0ed998f9f1f5", 
	                 "editable": false },
	               { "top": 134, 
	                 "left": 179, 
	                 "width": 68, 
	                 "height": 74, 
	                 "text": "National Gallery Dome", 
	                 "id": "e7f44ac5-bcf2-412d-b440-6dbb8b19ffbe", 
	                 "editable": true } ]   
	    });
	  });
	</script>

It is important to use the `$(function() { ... });`  function as this will fire once the page and 
all it's images have loaded. Failing to do so will result in the plugin executing before the image 
dimensions have been determined.

The HTML markup for the page looks like this:

	<html>
	  	<head>
	    	<title>Demo Page</title>
	  	</head>
	  	<body>
	    	<div>
	      		<img id="toAnnotate" src="images/trafalgar-square-annotated.jpg" alt="Trafalgar Square" />
	    	</div>
	  	</body>
	</html>

A copy of all this code is included in the release.

###Build:

A minimized distribution of the plugin and required resources is available in ```dist/```. 
To rebuild yourself do:

```sh
# Download jQuery dependencies
bower install
# Delete dist directory
grunt clean
# Build
grunt
```

```dist/js/jquery.annotate.concat.min.js``` includes all of the required javascript 
minimized and concated into one file.

###History:

####Version 1.4 19th January, 2011
* Upgraded jQuery to version 1.7.1


####Version 1.3 22nd June, 2009
* Fixed a bug when creating a new annotation via AJAX.
* The Id of the annotation is expected to be returned as a JSON object from the response of the save call, e.g.

    `{ "annotation_id": "000001" }`


####Version 1.2 24th April, 2009
* Fixed jQuery UI 1.3.2 compatibility.
* Forked source for jQuery 1.2.x and 1.3.x
* Notes now fade in/out - be sure to add correct jQuery UI components.
* Tidied up CSS/positioning.


####Version 1.1: 2nd April, 2009
* Fixed bug when annotating an image with no previous annotations.


####Version 1.0: 11th March, 2009
* Initial release


###Credits:

Based on the Drupal extension:

Image Annotations by Ronan Berder  
hunvreus@gmail.com  
[http://drupal.org/project/image_annotate] [2]  
[http://drupal.org/user/49057] [3]  
[http://teddy.fr] [4]  


FamFamFam Icons by:  
Mark James  
[http://www.famfamfam.com/] [5]  
                                  

Trafalgar Square image by:  
Maurice  
[http://www.flickr.com/photos/mauricedb/2742966709/] [6]  

###Licence:

Released under the GNU license.

  [1]: http://flipbit.co.uk/jquery-image-annotation.html             "jQuery Image Annotation Plugin"
  [2]: http://drupal.org/project/image_annotate
  [3]: http://drupal.org/user/49057
  [4]: http://teddy.fr
  [5]: http://www.famfamfam.com/
  [6]: http://www.flickr.com/photos/mauricedb/2742966709/
  [7]: https://github.com/flipbit/jquery-image-annotate/zipball/master