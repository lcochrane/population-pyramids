var currentMainId = undefined;
var currentCompareId = undefined;

d3.json('/regions.json', function(regions) {
    var regionIdLookupTable = {}
    _.each(regions, function(d) {
        regionIdLookupTable[d.name.toLowerCase()] = d.id;
    });

    var setupTypeahead = function(id) {
        $(id).typeahead({
            'source': _.map(regions, function(region) { return region.name; })
        });
        $(id).change(function(e){
            updatePyramid();
        });
        $(id).submit(function(e) {
            e.preventDefault();
            updatePyramid();
        });
        $(id).keydown(function(e) {
            if (e.keyCode == 13 && !$(id).data('typeahead').shown) {
                updatePyramid();
            }
        });
    };

    var showMainError = function(mainName) {
        $('#mainErrorMessage').text("Place '" + mainName + "' not found.");
        $('#mainErrorBox').show();
    };
    var showCompareError = function(compareName) {
        $('#compareErrorMessage').text("Place '" + compareName + "' not found for comparison.");
        $('#compareErrorBox').show();
    };

    var updateInProgress = false;
    var updatePyramid = function(mainName, compareName) {
        if (updateInProgress) {
            return; // XXX UI elements should be deactivated
        }

        if (mainName === undefined) {
            mainName = $('#select_main').val();
        }
        if (compareName === undefined) {
            compareName = $('#select_compare').val();
        }

        var mainId = regionIdLookupTable[mainName.toLowerCase()];
        var compareId = regionIdLookupTable[compareName.toLowerCase()];

        if (mainId === currentMainId && compareId === currentCompareId) {
            return;
        } else {
            currentMainId = mainId;
            currentCompareId = compareId;
        }

        updateInProgress = true;

        $('#chart').empty();
        $('.popover').remove(); // remove open popovers

        if (mainId === undefined && compareId == undefined) {
            showMainError(mainName);
            showCompareError(compareName);
            updateInProgress = false;
        } else if (mainId === undefined) {
            showMainError(mainName);
            $('#compareErrorBox').hide();
            updateInProgress = false;
        } else if (compareId === undefined) {
            $('#mainErrorBox').hide();
            showCompareError(compareName);
            $('#loadingBox').show();

            d3.json('/region/' + mainId + '.json', function(data) {
                renderChart(data, undefined, mainName, undefined);
                updateInProgress = false;
                $('#loadingBox').hide();
            });
        } else {
            $('#mainErrorBox').hide();
            $('#compareErrorBox').hide();
            $('#loadingBox').show();

            // TODO parallel loading
            d3.json('/region/' + mainId + '.json', function(data) {
                d3.json('/region/' + compareId + '.json', function(compareData) {
                    renderChart(data, compareData, mainName, compareName);
                    updateInProgress = false;
                    $('#loadingBox').hide();
                });
            });
        }

        updateUrl(mainName, compareName);

        // window.location.hash = mainName.replace(/\s/g,'+') + '&' + compareName.replace(/\s/g,'+')
        window.document.title = "Population Pyramids - " + mainName + " compared to " + compareName;

        addthis_share = {
            email_vars: { CustomText: 'Age profile of ' + mainName + ' compared to ' + compareName },
            email_template: "pop_pyramid",
            description: 'Age profile of ' + mainName + ' compared to ' + compareName,
            templates : {
                twitter: 'Age profile of ' + mainName + ' compared to ' + compareName+ ' {{url}} (by @jamiestarke and @lgrammel)'
            }
        }

        _gaq.push(['_trackPageview',window.location.pathname+window.location.hash]);
        _gat._getTrackerByName()._trackEvent('Region View', mainName, "Main Region");
        _gat._getTrackerByName()._trackEvent('Region View', compareName, "Comparison Region");
    }

    setupTypeahead('#select_main');
    setupTypeahead('#select_compare');

    // routing
    var updateUrl = function(mainName, compareName) {
        hasher.setHash(encodeURIComponent(mainName) + '/' + encodeURIComponent(compareName));
    }

    crossroads.addRoute('/{place}/{comparisonPlace}', function(place, comparisonPlace){
        place = decodeURIComponent(place);
        comparisonPlace = decodeURIComponent(comparisonPlace);

        $("#select_main").val(place);
        $("#select_compare").val(comparisonPlace);

        updatePyramid(place, comparisonPlace);
    });
    crossroads.bypassed.add(function() {
        // if we cannot match the route, reset to default
        updateUrl('Capital, BC (CD)', 'Canada');
    });

    var parseHash = function(newHash, oldHash) {
        crossroads.parse(newHash);
    }
    hasher.initialized.add(parseHash);
    hasher.changed.add(parseHash);
    hasher.init();

});

