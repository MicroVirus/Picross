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

.controller('PicrossCtrl', ['$scope', 'picrossFactory', '$window', function($scope, picrossFact, $window) {

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

    const LeftButton = 1;       //
    const RightButton = 2;      // (event.buttons convention)
    const MiddleButton = 4;     //

    var buttonToTicking = {};
    buttonToTicking[LeftButton] = picross.Ticked;
    buttonToTicking[RightButton] = picross.Crossed;
    buttonToTicking[MiddleButton] = picross.Unticked;

    var mouseInput = {
        pressed: false,
        button: LeftButton,
        start: {row: undefined, col: undefined},
        hover: {row: undefined, col: undefined}
    };

    function tableCellMouseDown(event, row, col)
    {
        event = event || $window.event;

        // Start a ticking operation; override any buttons that are currently pressed with the new button.
        beginTickDrag(jsToButtons(event.button), row, col);
        performTick(buttonToTicking[mouseInput.button], row, col)
    }

    function tableCellMouseUp(event, row, col) {
        event = event || $window.event;

        // If the same button went 'up' as the current ticking-operation then cancel the operation.
        if (mouseInput.pressed && jsToButtons(event.button) == mouseInput.button)
        {
            endTickDrag(jsToButtons(event.button), row, col);
        }
    }

    function tableCellMouseEnter(event, row, col)
    {
        event = event || $window.event;

        // If the mouse went 'up' outside our area, cancel the ticking
        if (mouseInput.pressed && (event.buttons & mouseInput.button) == 0)
        {
            endTickDrag(mouseInput.button, row, col);
        }

        // If a mouse button went 'down' outside our area and we aren't ticking then start a new ticking
        if (!mouseInput.pressed && event.buttons != 0)
        {
            // Select the new button; Middle > Right > Left on ties.
            if ((event.buttons & MiddleButton) != 0)
                beginTickDrag(MiddleButton, row, col);
            else if ((event.buttons & RightButton) != 0)
                beginTickDrag(RightButton, row, col);
            else if ((event.buttons & LeftButton) != 0)
                beginTickDrag(LeftButton, row, col);
            else
                beginTickDrag(LeftButton, row, col);
        }

        if (mouseInput.pressed)
        {
            mouseInput.hover.row = row;
            mouseInput.hover.col = col;
            performTick(buttonToTicking[mouseInput.button], row, col);
        }
    }

    function tableContextMenuHandler(event, row, col)
    {
        //event = event || $window.event;
        return false;
    }

    function beginTickDrag(button, row, col)
    {
        mouseInput.pressed = true;
        mouseInput.button = button;
        mouseInput.start.row = row;
        mouseInput.start.col = col;
        mouseInput.hover.row = row;
        mouseInput.hover.col = col;
    }

    function endTickDrag(button, row, col)
    {
        mouseInput.pressed = false;
    }

    function performTick(tick, row, col)
    {
        picross.field[row * picross.width + col] = tick;
    }

    // Handle that event.button uses wildly different values than event.buttons. We use the buttons (flag) convention.
    function jsToButtons(jsButton)
    {
        if (jsButton == 0) return LeftButton;
        else if (jsButton == 2) return RightButton;
        else if (jsButton == 1) return MiddleButton;
        else return LeftButton;
    }

    // NEXT STEP: Handle contextual clicks, e.g. starting at ticked means you're unticking.
    // THEN: Handle row/col-fixing: once you start ticking within a row or col, disallow ticking outside of that row/col.
    // THEN: Handle modifiers (e.g. Shift) to force unticking.
    // TODO: Also allow mouse input to start from a header, and perhaps also add an 'invisble' edge right and bottom so we can catch input from there too.
    // TODO: If the mouse enters a field and if mouseInput says we're not pressed then we can start a new pressed on that field.
    // TODO: Also use the picross-container enter/leave event (or maybe the other one) to your advantage



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
            if ( ! image[row * width + col] ) filling++;
            image[row * width + col] = true;
        }
        console.log("Generated new Picross image: filling factor is " + filling/(width*height) + "% (" + filling + " out of " + width*height + ")");

        return image;
    }
}]);