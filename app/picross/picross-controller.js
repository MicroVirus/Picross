'use strict';

angular.module('picross')

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/picross', {
        templateUrl: 'picross/picross.html',
        controller: 'PicrossCtrl'
    });
}])

// ngRightClick taken from http://stackoverflow.com/questions/15731634/how-do-i-handle-right-click-events-in-angular-js/15732476#15732476
.directive('ngContextmenu', function($parse) {
    return function(scope, element, attrs) {
        var fn = $parse(attrs.ngContextmenu);
        element.bind('contextmenu', function(event) {
            scope.$apply(function() {
                event.preventDefault();
                fn(scope, {$event:event});
            });
        });
    };
})

.controller('PicrossCtrl', ['$scope', 'picrossFactory', function($scope, picrossFact) {
    // Private member variables
    var picross;
    var topHeaderSize;
    var leftHeaderSize;

    // Initialise member variables
    activate();


    ///
    /// View interface (scope members)
    ///

    $scope.picross                          = picross;
    $scope.topHeaderRows                    = topHeaderFromHints(picross, topHeaderSize);
    $scope.leftHeaderRows                   = leftHeaderFromHints(picross, leftHeaderSize);
    // CSS styles for the HTML elements based on the current picross state
    $scope.getStyleForField                 = getStyleForField;
    $scope.getStyleForImage                 = getStyleForImage;
    $scope.getPicrossTableCornerStyle       = getPicrossTableCornerStyle;
    $scope.getPicrossTableTopHeaderStyle    = getPicrossTableTopHeaderStyle;
    $scope.getPicrossTableLeftHeaderStyle   = getPicrossTableLeftHeaderStyle;
    $scope.getPicrossTableCellStyle         = getPicrossTableCellStyle;
    /// Input handling
    $scope.tableCellMouseDown               = tableCellMouseDown;
    $scope.tableCellMouseUp                 = tableCellMouseUp;
    $scope.tableCellMouseEnter              = tableCellMouseEnter;
    $scope.tableContextMenuHandler          = tableContextMenuHandler;


    ///
    /// Initialisation functions
    ///

    function activate()
    {
        picross = generatePicross(15, 15);
        // Calculate top and left header sizes
        topHeaderSize = Math.max.apply(Math, picross.columnHints.map(function (arr) {return arr.length;}));
        leftHeaderSize = Math.max.apply(Math, picross.rowHints.map(function (arr) {return arr.length;}));
    }


    ///
    /// View functions
    ///

    function getStyleForField(row, col)
    {
        var field = picross.field[row * picross.width + col];
        if (field == picross.Unticked) return 'field-unticked';
        else if (field == picross.Ticked) return 'field-ticked';
        else if (field == picross.Crossed) return 'field-crossed';
        else throw "Bad field value";
    }

    function getStyleForImage(row, col)
    {
        return picross.image[row * picross.width + col] ? 'field-ticked' : 'field-unticked';
    }

    function getPicrossTableCornerStyle(row, col)
    {
        var isBottom = (row == topHeaderSize-1), isRight = (col == leftHeaderSize-1);
        if (isBottom && isRight) return 'corner-bottom-piece corner-right-piece';
        else if (isBottom) return 'corner-bottom-piece';
        else if (isRight) return 'corner-right-piece';
        else return 'corner-empty-piece';
    }

    function getPicrossTableTopHeaderStyle(row, col)
    {
        var classes = '';
        var emptyCell = (topHeaderIndexToColumnHintIndex(col, row, topHeaderSize) == null);
        if (col > 0 && col % 5 == 0) classes += 'col-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'top-header-cell ';
        if (row == topHeaderSize-1) classes += 'top-header-bottom-cell ';

        return classes;
    }

    function getPicrossTableLeftHeaderStyle(row, col)
    {
        var classes = '';
        var emptyCell = (leftHeaderIndexToRowHintIndex(row, col, leftHeaderSize) == null);
        if (row > 0 && row % 5 == 0) classes += 'row-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'left-header-cell ';
        if (col == leftHeaderSize-1) classes += 'left-header-right-cell ';

        return classes;
    }


    function getPicrossTableCellStyle(row, col)
    {
        var classes = '';

        if (row > 0 && (row % 5) == 0) classes += 'row-separator ';
        if (col > 0 && (col % 5) == 0) classes += 'col-separator ';

        return classes;
    }


    ///
    /// Input handling
    ///

    var mouseInput = {pressed: false, start: {row: undefined, col: undefined}, hover: {row: undefined, col: undefined}};

    function tableCellMouseDown(event, row, col)
    {
        event = event || window.event;
        if (event.button == 0)
        {
            mouseInput.pressed = true;
            mouseInput.start.row = row;
            mouseInput.start.col = col;

            $scope.picross.field[row * picross.width + col] = picross.Ticked;
        }
    }
    function tableCellMouseUp(event, row, col)
    {
        event = event || window.event;

        mouseInput.pressed = false;
        mouseInput.start.row = row;
        mouseInput.start.col = col;
    }
    function tableCellMouseEnter(event, row, col)
    {
        event = event || window.event;

        // If the mouse went 'up!' outside our area, cancel the dragging
        // TODO: If you add WHICH button to mouseInput, also respond to if that one is no longer clicked.
        //       Use buttons rather than button property.
        if (event.buttons == 0)
        {
            mouseInput.pressed = false;
        }

        if (event.button == 0 && mouseInput.pressed)
        {
            picross.field[row * picross.width + col] = picross.Ticked;
            mouseInput.hover.row = row;
            mouseInput.hover.col = col;
        }
    }
    function tableContextMenuHandler(event, row, col)
    {
        event = event || window.event;
        return false;
    }
    // TODO: Also allow mouse input to start from a header, and perhaps also add an 'invisble' edge right and bottom so we can catch input from there too.




    ///
    /// Functions to infer size of top and left headers from the row and column hints
    ///

    function topHeaderFromHints(picross, topHeaderSize)
    {
        return rangeArray(0, topHeaderSize).map(
            getTopHeaderRow.bind(null, picross.width, picross.columnHints, topHeaderSize));
    }

    function leftHeaderFromHints(picross, leftHeaderSize)
    {
        return rangeArray(0, picross.height).map(
            function (hints, leftHeaderSize, row) {
                var hint = hints[row];
                var pad = leftHeaderSize - hint.length;
                return createArray(pad, "").concat(hint);
            }.bind(null, picross.rowHints, leftHeaderSize));
    }

    function getTopHeaderRow(width, hints, topHeaderSize, headerRow)
    {
        var header = [];
        for (var col = 0; col < width; col++)
        {
            var hint = hints[col];
            var index = topHeaderIndexToColumnHintIndex(col, headerRow, topHeaderSize);
            header.push(index != null ? hint[index] : "");
        }
        return header;
    }

    // Returns null if the index falls outside of the hint. 0 <= index < topHeaderSize.
    function topHeaderIndexToColumnHintIndex(col, index, topHeaderSize)
    {
        var hintIndex = index - (topHeaderSize - picross.columnHints[col].length);
        return (hintIndex >= 0 ? hintIndex : null);
    }

    // Returns null if the index falls outside of the hint. 0 <= index < leftHeaderSize.
    function leftHeaderIndexToRowHintIndex(row, index, leftHeaderSize)
    {
        var hintIndex = index - (leftHeaderSize - picross.rowHints[row].length);
        return (hintIndex >= 0 ? hintIndex : null);
    }


    ///
    /// Picross generation
    ///

    function generatePicross(width, height)
    {
        return picrossFact.create(width, height, generateImage(width, height));
    }
    function generateImage(width, height, fillingFactorHint)
    {
        fillingFactorHint = fillingFactorHint || 0.5;

        var filling = 0;
        var image = Array.apply(null, Array(width * height)).map(function () {return false;});
        for (var i = 0; i < fillingFactorHint * width * height; i++) {
            var row = randomInt(0, height - 1), col = randomInt(0, width - 1);
            if ( ! image[row * width + col]) filling++;
            image[row * width + col] = true;
        }
        console.log("Generated new Picross image: filling factor is " + filling/(width*height) + "% (" + filling + " out of " + width*height + ")");

        return image;
    }
}]);