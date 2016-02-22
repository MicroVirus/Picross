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
    var sharedView;
    var view;


    // Initialise member variables
    activate();


    ///
    /// View interface (scope members)
    ///

    $scope.picross                          = picross;
    // Note: the undefined functions are bound to a view at activation and view-switching.
    // CSS styles for the HTML elements based on the current picross state
    $scope.getStyleForField                 = undefined;
    $scope.getStyleForImage                 = undefined;
    $scope.getPicrossTableCornerStyle       = undefined;
    $scope.getPicrossTableTopHeaderStyle    = undefined;
    $scope.getPicrossTableLeftHeaderStyle   = undefined;
    $scope.getPicrossTableCellStyle         = undefined;
    /// Input handling
    $scope.tableCellMouseDown               = undefined;
    $scope.tableCellMouseUp                 = undefined;
    $scope.tableCellMouseEnter              = undefined;
    $scope.tableContextMenuHandler          = undefined;

    bindViewToScope(view);

    $scope.topHeaderRows                    = topHeaderFromHints(picross, topHeaderSize);
    $scope.leftHeaderRows                   = leftHeaderFromHints(picross, leftHeaderSize);



    ///
    /// Initialisation functions
    ///

    function activate()
    {
        picross = generatePicross(15, 15);
        // Calculate top and left header sizes
        topHeaderSize = Math.max.apply(Math, picross.columnHints.map(function (arr) {return arr.length;}));
        leftHeaderSize = Math.max.apply(Math, picross.rowHints.map(function (arr) {return arr.length;}));
        // Activate a view
        sharedView = new PicrossViewShared(picross, topHeaderSize, leftHeaderSize);
        view = new PicrossPlayView(sharedView, picross, topHeaderSize, leftHeaderSize);
    }

    function bindViewToScope(view)
    {
        // CSS styles for the HTML elements based on the current picross state
        $scope.getStyleForField                 = view.getStyleForField.bind(view);
        $scope.getStyleForImage                 = view.getStyleForImage.bind(view);
        $scope.getPicrossTableCornerStyle       = view.getPicrossTableCornerStyle.bind(view);
        $scope.getPicrossTableTopHeaderStyle    = view.getPicrossTableTopHeaderStyle.bind(view);
        $scope.getPicrossTableLeftHeaderStyle   = view.getPicrossTableLeftHeaderStyle.bind(view);
        $scope.getPicrossTableCellStyle         = view.getPicrossTableCellStyle.bind(view);
        /// Input handling
        $scope.tableCellMouseDown               = view.tableCellMouseDown.bind(view);
        $scope.tableCellMouseUp                 = view.tableCellMouseUp.bind(view);
        $scope.tableCellMouseEnter              = view.tableCellMouseEnter.bind(view);
        $scope.tableContextMenuHandler          = view.tableContextMenuHandler.bind(view);
    }



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
            var index = view.topHeaderIndexToColumnHintIndex(col, headerRow, topHeaderSize);
            header.push(index != null ? hint[index] : "");
        }
        return header;
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



///
/// Separating the picross view behaviour into a shared component, a play component and a won component.
///

// TODO: Add edit component for creating a puzzle?


// Shared functionality for views
function PicrossViewShared(picross, topHeaderSize, leftHeaderSize)
{
    this.topHeaderIndexToColumnHintIndex = topHeaderIndexToColumnHintIndex;
    this.leftHeaderIndexToRowHintIndex = leftHeaderIndexToRowHintIndex;


    // (this will be naturally filled in as we introduce more views and see their commonalities)


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
}







// The core view, namely the Play the game view.
function PicrossPlayView(shared, picross, topHeaderSize, leftHeaderSize)
{
    ///
    /// Public interface for View
    ///

    // 'Inherited' members (from shared)
    this.topHeaderIndexToColumnHintIndex = shared.topHeaderIndexToColumnHintIndex;
    this.leftHeaderIndexToRowHintIndex = shared.leftHeaderIndexToRowHintIndex;

    // CSS styles for the HTML elements based on the current picross state
    this.getStyleForField                 = getStyleForField;
    this.getStyleForImage                 = getStyleForImage;
    this.getPicrossTableCornerStyle       = getPicrossTableCornerStyle;
    this.getPicrossTableTopHeaderStyle    = getPicrossTableTopHeaderStyle;
    this.getPicrossTableLeftHeaderStyle   = getPicrossTableLeftHeaderStyle;
    this.getPicrossTableCellStyle         = getPicrossTableCellStyle;
    /// Input handling
    this.tableCellMouseDown               = tableCellMouseDown;
    this.tableCellMouseUp                 = tableCellMouseUp;
    this.tableCellMouseEnter              = tableCellMouseEnter;
    this.tableContextMenuHandler          = tableContextMenuHandler;
    



    ///
    /// View functions
    ///

    function getStyleForField(row, col)
    {
        var classes = '';
        var field = picross.field[row * picross.width + col];

        if (field == picross.Unticked) classes += 'field-unticked ';
        else if (field == picross.Ticked) classes += 'field-ticked ';
        else if (field == picross.Crossed) classes += 'field-crossed ';
        else throw "Bad field value";

        return classes;
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
        var emptyCell = (this.topHeaderIndexToColumnHintIndex(col, row, topHeaderSize) == null);
        if (col > 0 && col % 5 == 0) classes += 'col-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'top-header-cell ';
        if (row == topHeaderSize-1) classes += 'top-header-bottom-cell ';

        if (isColDragActive(col)) classes += 'drag-active ';
        else if (col == mouseInput.hover.col) classes += 'hover-active ';

        return classes;
    }

    function getPicrossTableLeftHeaderStyle(row, col)
    {
        var classes = '';
        var emptyCell = (this.leftHeaderIndexToRowHintIndex(row, col, leftHeaderSize) == null);
        if (row > 0 && row % 5 == 0) classes += 'row-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'left-header-cell ';
        if (col == leftHeaderSize-1) classes += 'left-header-right-cell ';

        if (isRowDragActive(row)) classes += 'drag-active ';
        else if (row == mouseInput.hover.row) classes += 'hover-active ';

        return classes;
    }

    function getPicrossTableCellStyle(row, col)
    {
        var classes = '';

        if (row > 0 && (row % 5) == 0) classes += 'row-separator ';
        if (col > 0 && (col % 5) == 0) classes += 'col-separator ';

        if (isRowDragActive(row) || isColDragActive(col)) classes += 'drag-active ';

        return classes;
    }

    function isRowDragActive(row)
    {
        return mouseInput.pressed &&
            DragFixing.isRowConfined(mouseInput.fixing) &&
            mouseInput.start.row == row;
    }
    function isColDragActive(col)
    {
        return mouseInput.pressed &&
            DragFixing.isColConfined(mouseInput.fixing) &&
            mouseInput.start.col == col;
    }



    ///
    /// Input handling
    ///

    const LeftButton = 1;       //
    const RightButton = 2;      // (event.buttons convention)
    const MiddleButton = 4;     //

    // Drag fixing to tick only within the same row or column. None is freeform-mode, RowColumnUndecided is initial mode.
    const DragFixing = {
        None: 0, Column: 1, Row: 2, RowColumnUndecided: 3,

        isRowConfined: function (fix) {return fix == DragFixing.Row || fix == DragFixing.RowColumnUndecided;},
        isColConfined: function (fix) {return fix == DragFixing.Column || fix == DragFixing.RowColumnUndecided;}
    };
    Object.freeze(DragFixing);

    var mouseInput = {
        // Pressed state
        pressed: false,
        button: LeftButton,
        start: {fieldValue: picross.Unticked, row: undefined, col: undefined},
        drag: {row: undefined, col: undefined},
        fixing: DragFixing.None,
        // Non-pressed state
        hover: {row: undefined, col: undefined}
    };

    function tableCellMouseDown(event, row, col)
    {
        event = event || $window.event;

        // Start a ticking operation; override any buttons that are currently pressed with the new button.
        beginTickDrag(jsToButtons(event.button), row, col);
        performTick(buttonToTickAction(mouseInput.button, event.shiftKey), row, col)
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

        mouseInput.hover.row = row;
        mouseInput.hover.col = col;

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
            // Update drag fixing. Transition from row/column-undecided to either row or column.
            if (event.altKey) mouseInput.fixing = DragFixing.None;
            if (mouseInput.fixing == DragFixing.RowColumnUndecided &&
                (mouseInput.start.row != row || mouseInput.start.col != col)) // position other than start.
            {
                if (row == mouseInput.start.row)
                    mouseInput.fixing = DragFixing.Row;
                else if (col == mouseInput.start.col)
                    mouseInput.fixing = DragFixing.Column;
            }
            // Verify drag-fixing allows us to tick this field, then do so.
            if (dragfixCanTick(mouseInput.fixing, row, col, mouseInput.start.row, mouseInput.start.col))
            {
                mouseInput.drag.row = row;
                mouseInput.drag.col = col;
                performTick(buttonToTickAction(mouseInput.button, event.shiftKey), row, col);
            }
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
        mouseInput.start.fieldValue = picross.field[row * picross.width + col];
        mouseInput.start.row = row;
        mouseInput.start.col = col;
        mouseInput.drag.row = row;
        mouseInput.drag.col = col;
        mouseInput.fixing = DragFixing.RowColumnUndecided;
    }

    function endTickDrag(button, row, col)
    {
        mouseInput.pressed = false;
    }

    function performTick(tick, row, col)
    {
        // Contextual ticking: the ticking action depends on the initial field and the button action (tick).
        //
        //  Initial Field        Action (tick)       Result
        //  -------------        -------------       ------------
        //  Unticked             Unticked            <tick>
        //  Unticked             *                   Any Unticked -> <tick>
        //  Ticked               Ticked              Any Ticked -> Unticked
        //  Ticked               *                   <tick>
        //  Crossed              Crossed             Any Crossed -> Unticked
        //  Crossed              *                   <tick>
        //

        var initial = mouseInput.start.fieldValue;
        var currentValue = picross.field[row * picross.width + col];

        if (initial == picross.Unticked && tick != picross.Unticked)
        {
            if (currentValue == picross.Unticked)
                picross.field[row * picross.width + col] = tick;
        }
        else if (initial != picross.Unticked && initial == tick)
        {
            if (currentValue == initial)
                picross.field[row * picross.width + col] = picross.Unticked;
        }
        else
        {
            picross.field[row * picross.width + col] = tick;
        }
    }

    function dragfixCanTick(fix, row, col, startRow, startCol)
    {
        switch (fix) {
            case DragFixing.Row:
                return row == startRow;
            case DragFixing.Column:
                return col == startCol;
            case DragFixing.RowColumnUndecided:
                return (row == startRow || col == startCol);
            case DragFixing.None:
                return true;
            default:
                throw "Unknown dragfix option"
        }
    }

    // Map button (plus modifiers) to ticking actions.
    function buttonToTickAction(button, shift)
    {
        // Shift + Left-button is an alternative to middle-button
        if (button == LeftButton && !shift)
            return picross.Ticked;
        else if (button == RightButton)
            return picross.Crossed;
        else if (button == MiddleButton || (shift && button == LeftButton))
            return picross.Unticked;
    }

    // Handle that event.button uses wildly different values than event.buttons. We use the buttons (flag) convention.
    function jsToButtons(jsButton)
    {
        if (jsButton == 0) return LeftButton;
        else if (jsButton == 2) return RightButton;
        else if (jsButton == 1) return MiddleButton;
        else return LeftButton;
    }
}