var map;

var multiPolygons = {
    collection: {},
    selectedGroup: null,
    add: function(e, color) {
        var polygonArr = [];
        for (var key in Object.keys(e)) {
            var polygon = e[key];
            polygon.setMap(map);
            polygonArr.push(polygon);
        }
        var group = {},
            that = this;
        group.id = new Date().getTime() + Math.floor(Math.random() * 1000);
        group.color = color;
        group.polygonList = polygonArr;
        this.collection[group.id] = group;
        return group.id;
    },
    setSelection: function(multiPolygonsID) {
        if (this.selectedGroup !== multiPolygonsID) {
            this.selectedGroup = multiPolygonsID;
            for (var polygon in multiPolygons.collection[multiPolygonsID].polygonList) {
                multiPolygons.collection[multiPolygonsID].polygonList[polygon].set('editable', true);
            }
        }
    },
    delete: function(multiPolygonsID) {
        for (var polygon in multiPolygons.collection[multiPolygonsID].polygonList) {
            multiPolygons.collection[multiPolygonsID].polygonList[polygon].setMap(null);
        }
        delete this.collection[multiPolygonsID];
    },
    hide: function(multiPolygonsID) {
        for (var polygon in multiPolygons.collection[multiPolygonsID].polygonList) {
            multiPolygons.collection[multiPolygonsID].polygonList[polygon].setMap(null);
        }
    },
    show: function(multiPolygonsID) {
        for (var polygon in multiPolygons.collection[multiPolygonsID].polygonList) {
            multiPolygons.collection[multiPolygonsID].polygonList[polygon].setMap(map);
        }
    }
};

var polygons = {
    collection: {},
    selectedShape: null,
    add: function(e) {
        var shape = e.overlay,
            that = this;
        shape.type = e.type;
        shape.path = e.overlay.getPath();
        shape.id = new Date().getTime() + Math.floor(Math.random() * 1000);
        this.collection[shape.id] = shape;
        this.setSelection(shape);
        google.maps.event.addListener(shape,'click', function() {
            that.setSelection(this);
        });
        google.maps.event.addListener(shape, 'rightclick', function(event) {
            handleContextMenu(event, this);
        });
        return shape.id;
    },
    hide: function(polygon) {
        polygon.setMap(null);
    },
    show: function(polygon) {
        polygon.setMap(map);
    },
    delete: function(polygon) {
        polygon.setMap(null);
        delete this.collection[polygon.id];
    },
    clearAll: function() {
        for (polygonID in this.collection) {
            managePolygon(polygonID, "delete");
            polygons.delete(polygons.collection[polygonID]);
        }
    },
    newMultiPolygon: function(poly) {
        var shape = poly,
            that = this;
        shape.type = "polygon";
        shape.path = poly.getPath();
        shape.id = new Date().getTime() + Math.floor(Math.random() * 1000);
        this.collection[shape.id] = shape;
        return shape.id;
    },
    newPolygon: function(poly) {
        var shape = poly,
            that = this;
        shape.type = "polygon";
        shape.path = poly.getPath();
        shape.id = new Date().getTime() + Math.floor(Math.random() * 1000);
        this.collection[shape.id] = shape;
        this.setSelection(shape);
        google.maps.event.addListener(shape,'click', function() {
            that.setSelection(this);
        });
        shape.setMap(map);
        return shape.id;
    },
    setSelection: function(shape) {
        if(this.selectedShape !== shape) {
            this.clearSelection();
            this.selectedShape = shape;
            shape.set('editable', true);
        }
    },
    deleteSelected: function() {
        if(this.selectedShape) {
            var shape= this.selectedShape;
            this.clearSelection();
            shape.setMap(null);
            delete this.collection[shape.id];
        }
    },
    clearSelection: function() {
        if(this.selectedShape) {
            this.selectedShape.set('draggable', false);
            this.selectedShape.set('editable', false);
            this.selectedShape = null;
        }
    },
    save: function() {
        var collection = [];
        for (var k in this.collection) {
            var shape = this.collection[k],
            types = google.maps.drawing.OverlayType;
            switch(shape.type) {
                case types.POLYGON:
                    collection.push({
                        type:shape.type,
                        path:google.maps.geometry.encoding.encodePath(
                            shape.getPath())
                    });
                    break;
                default:
                    alert('implement a storage-method for ' + shape.type)
            }
        }
    },
    generateColor: function(e) {
        var colorVal = "#";
        for(var x = 0; x < 6; x++) {
            var randNum = Math.floor(Math.random() * 10) + 6;
            switch(randNum) {
                case 10:
                    colorVal += "A";
                    break;
                case 11:
                    colorVal += "B";
                    break;
                case 12:
                    colorVal += "C";
                    break;
                case 13:
                    colorVal += "D";
                    break;
                case 14:
                    colorVal += "E";
                    break;
                case 15:
                    colorVal += "F";
                    break;
                default:
                    colorVal += randNum.toString();
            }
        }
        return colorVal;
    }
};

function initialize() {
    var mapProp = {
        center: new google.maps.LatLng(38.7931,-89.9967),
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map"), mapProp);
    var polyOptions = {
        fillColor : polygons.generateColor(),
        fillOpacity: .8,
        strokeWeight: 4,
        zIndex: 1
    };
    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon']
        },
        polygonOptions: polyOptions
    });
    drawingManager.setMap(map);
    google.maps.event.addListener(drawingManager, "overlaycomplete", function(event) {
        var polygonOptions = drawingManager.get('polygonOptions');
        polygonOptions.fillColor = polygons.generateColor();
        drawingManager.set('polygonOptions', polygonOptions);
        managePolygon(polygons.add(event), "add");
        $("#clear-regions").removeClass("hidden");
    });
    showEmptyRegionList();
    $('#find-intersections').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_intersections",
            success: function(data) {
                if (data.success) {
                    generateNewPolygon(data);
                }
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    $('#find-unions').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_unions",
            success: function(data) {
                if (data.success)
                    generateNewPolygon(data);
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    $('#find-differences').click(function() {
        $.ajax({
            type: "POST",
            url: "/api/find_difference",
            success: function(data) {
                if (data.success)
                    generateNewPolygon(data);
            },
            failure: function(data) {
                console.log(data);
            }
        });
    });
    $("#clear-regions").on("click", function(e) {
        polygons.clearAll();
        $("#region-list").empty();
        showEmptyRegionList();
        $("#clear-regions").addClass("hidden");
    });
}

function managePolygon(polygonID, action) {
    if (action === "add") {
        data = JSON.stringify(
            {
                "id": polygonID,
                "path": polygons.collection[polygonID].path.getArray(),
                "action": action
            }
        );
        addPolygonToList(polygonID);
    } else if (action === "delete") {
        data = JSON.stringify(
            {
               "id": polygonID,
               "action": action
            }
        );
    } else {
        data = JSON.stringify(
            {
               "id": polygonID,
               "action": action
            }
        );
    }
    $.ajax({
        type: "POST",
        url: "/api/manage_region",
        data: {"data": data},
        success: function(data) {

        },
        failure: function(data) {
            console.log(data);
        }
    });
}

function addMultiPolygonToList(multiPolygonID) {
    var fillColor = multiPolygons.collection[multiPolygonID].color;
    $("#placeholder-empty").remove();
    $("#region-list").append(
        $("<li>").attr("id", multiPolygonID).attr("class", "list-group-item row")
            .attr("style", "margin: 1%; background-color: " + fillColor + ";")
            .append($("<p>").attr("style", "padding-bottom: 5%;").text("Region ID: " + multiPolygonID))
            .append($("<button>").attr("id", "show-hide-" + multiPolygonID).attr("class", "btn btn-default col-md-5 mobile-device").attr("style", "padding-bottom: 1%").text("Hide"))
            .append($("<div>").attr("class", "col-md-2"))
            .append($("<button>").attr("id", "delete-" + multiPolygonID).attr("class", "btn btn-danger col-md-5 mobile-device").text("Delete"))
    );

    $("#delete-" + multiPolygonID).on("click", function(e) {
        multiPolygons.delete(multiPolygonID);
        $(this).parent().remove();
        if (!$("#region-list").children().length) {
            showEmptyRegionList();
            $("#clear-regions").addClass("hidden");
        }
    })

    $("#show-hide-" + multiPolygonID).on("click", function(e) {
        if ($(this).text() === "Hide") {
            $(this).text("Show");
            multiPolygons.hide(multiPolygonID);
        } else {
            $(this).text("Hide");
            multiPolygons.show(multiPolygonID);
        }
    })

    $("#" + multiPolygonID).on("click", function(e) {
        multiPolygons.setSelection(multiPolygonID);
    })
}

function addPolygonToList(polygonID) {
    var fillColor = polygons.collection[polygonID].fillColor;
    $("#placeholder-empty").remove();
    $("#region-list").append(
        $("<li>").attr("id", polygonID).attr("class", "list-group-item row")
            .attr("style", "margin: 1%; background-color: " + fillColor + ";")
            .append($("<p>").attr("style", "padding-bottom: 5%;").text("Region ID: " + polygonID))
            .append($("<button>").attr("id", "show-hide-" + polygonID).attr("class", "btn btn-default col-md-5 mobile-device").attr("style", "padding-bottom: 1%").text("Hide"))
            .append($("<div>").attr("class", "col-md-2"))
            .append($("<button>").attr("id", "delete-" + polygonID).attr("class", "btn btn-danger col-md-5 mobile-device").text("Delete"))
    );
    $("#show-hide-" + polygonID).on("click", function(e) {
        var polygon = polygons.collection[polygonID];
        showHidePolygonButton(this, polygon);
    })
    $("#delete-" + polygonID).on("click", function(e) {
        var polygonID = $(this).parent().attr("id");
        var polygon = polygons.collection[polygonID];
        deletePolygonButton(this, polygon);
    })
    $("#" + polygonID).on("click", function(e) {
        var polygon = polygons.collection[polygonID];
        polygons.setSelection(polygon);
    })
}

function deletePolygonButton(button, polygon) {
    managePolygon(polygon.id, "delete");
    polygons.delete(polygon);
    $(button).parent().remove();
    if (!$("#region-list").children().length) {
        showEmptyRegionList();
        $("#clear-regions").addClass("hidden");
    }
}

function showHidePolygonButton(button, polygon) {
    if ($(button).text() === "Hide") {
        $(button).text("Show");
        polygons.hide(polygon);
    } else {
        $(button).text("Hide");
        polygons.show(polygon);
    }
    managePolygon(polygon.id, "visible");
}

function clearSession() {
    $.ajax({
        type: "POST",
        url: "/api/clear_session",
        success: function(data) {
        },
        failure: function(data) {
            console.log(data);
        }
    });
}

function handleMultiPolygons(polygonIdList, color) {
        var multiPolygonArr = new Array();
        for (var id in polygonIdList) {
            var polyID = polygonIdList[id];
            multiPolygonArr.push(polygons.collection[polyID]);
        }

        var groupID = multiPolygons.add(multiPolygonArr, color);
        addMultiPolygonToList(groupID);
}

function generateNewPolygon(polygonList) {
    var objKeys = Object.keys(polygonList.data);
    var isMulti = objKeys.length > 1;
    var multiPolygonsArr = new Array();
    var color = polygons.generateColor();
    for (var polygon in polygonList.data) {
        var arr = new Array();
        for (var i = 0; i < polygonList.data[polygon].length; i++) {
            arr.push(new google.maps.LatLng(polygonList.data[polygon][i].lat, polygonList.data[polygon][i].lng));
        }
        var poly = new google.maps.Polygon({
            paths: arr,
            strokeWeight: 4,
            fillColor: isMulti ? color : polygons.generateColor,
            fillOpacity: 0.8,
            zIndex: 3
        });
        if (!isMulti) {
            var polygonID = polygons.newPolygon(poly)
            managePolygon(polygonID, "add");
        } else {
            var polygonID = polygons.newMultiPolygon(poly);
            multiPolygonsArr.push(polygonID);
        }
    }
    if (isMulti) {
        handleMultiPolygons(multiPolygonsArr, color);
    }
}

function generateNewMultiPolygon(polygonList) {

}

function showEmptyRegionList() {
    $("#region-list").append(
        $("<li>").attr("id", "placeholder-empty").attr("class", "list-group-item").text(
            "No regions created. Draw on the map to create regions or import from a database.")
    );
}

function handleContextMenu(event, polygon) {
    // Show contextmenu
    $("#custom-menu").finish().toggle(100).css({
        top: event.eb.pageY + "px",
        left: event.eb.pageX + "px"
    });
    $("#custom-menu").removeClass("hidden");
    // If the menu element is clicked
    $("#custom-menu div").unbind().click(function(e) {
        // This is the triggered action name
        switch($(this).attr("data-action")) {
            case "hide": {
                var button = "#show-hide-" + polygon.id;
                showHidePolygonButton(button, polygon);
                $("#custom-menu").addClass("hidden");
                break;
            }
            case "delete": {
                var button = "#delete-" + polygon.id;
                deletePolygonButton(button, polygon);
                $("#custom-menu").addClass("hidden");
                break;
            }
            case "close": {
                $("#custom-menu").addClass("hidden");
                break;
            }
        }
      });
}

$(document).ready(function() {
    initialize();
    clearSession();
    $(document).on("click", function(e) {
        var target = $(e.target);
        if (!$("#custom-menu").hasClass("hidden")) {
            if (!(target.is("h4") || target.is("#custom-menu")))
                $("#custom-menu").addClass("hidden");
        }
    });
});
