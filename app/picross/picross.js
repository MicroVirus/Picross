'use strict';

angular.module('picross.picross', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/picross', {
        templateUrl: 'picross/picross.html',
        controller: 'PicrossCtrl'
    });
}])

.controller('PicrossCtrl', ['$scope', function($scope) {
    // Playing field values
    const Unticked = 0, Ticked = 1, Crossed = 2;

    // Define picross
    $scope.picross = generatePicross(15, 15);

    // Calculate view quantities
    var topHeaderSize = Math.max.apply(Math, $scope.picross.columnHints.map(function (arr) {return arr.length;}));
    var leftHeaderSize = Math.max.apply(Math, $scope.picross.rowHints.map(function (arr) {return arr.length;}));

    // Create top header (basically a transpose with zero-fill)
    $scope.topHeaderRows = rangeArray(0, topHeaderSize).map(
        getTopHeaderRow.bind(null, $scope.picross.width, $scope.picross.columnHints, topHeaderSize));
    $scope.leftHeaderRows = rangeArray(0, $scope.picross.height).map(
        function (hints, leftHeaderSize, row) {
            var hint = hints[row];
            var pad = leftHeaderSize - hint.length;
            return createArray(pad, "").concat(hint);
        }.bind(null, $scope.picross.rowHints, leftHeaderSize));

    function getTopHeaderRow(width, hints, topHeaderSize, headerRow)
    {
        var header = [];
        for (var col = 0; col < width; col++)
        {
            var hint = hints[col];
            var index = topHeaderIndexToColumnHintIndex(col, headerRow);
            header.push(index != null ? hint[index] : "");
        }
        return header;
    }

    // Returns null if the index falls outside of the hint. 0 <= index < topHeaderSize.
    function topHeaderIndexToColumnHintIndex(col, index)
    {
        var hintIndex = index - (topHeaderSize - $scope.picross.columnHints[col].length);
        return (hintIndex >= 0 ? hintIndex : null);
    }

    // Returns null if the index falls outside of the hint. 0 <= index < leftHeaderSize.
    function leftHeaderIndexToRowHintIndex(row, index)
    {
        var hintIndex = index - (leftHeaderSize - $scope.picross.rowHints[row].length);
        return (hintIndex >= 0 ? hintIndex : null);
    }

    // Testing the picross by filling rows with random numbers; need to be become objects (arrays, probably) later on.
    //var picross = $scope.picross;
    //picross.rows = Array.apply(null, Array(picross.width)).map(function () {return Math.floor(Math.random() * (picross.width+1));});
    //picross.columns = Array.apply(null, Array(picross.height)).map(function () {return Math.floor(Math.random() * (picross.height+1));});



    ///
    /// Picross generation
    ///

    function generatePicross(width, height)
    {
        return new Picross(width, height, generateImage(width, height));
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


    function columnHintFromImage(image, width, height, col)
    {
        return hintFromImageScan(image, width, height, col, 0, 0, 1);
    }
    function rowHintFromImage(image, width, height, row)
    {
        return hintFromImageScan(image, width, height, 0, row, 1, 0);
    }
    // Create the row/column hint from the image. {colDelta: 1, rowDelta: 0} can be used for
    // scanning a row and the reverse for scanning a column.
    // Scanning starts at (col, row) and goes in the direction (colDelta, rowDelta).
    function hintFromImageScan(image, width, height, col, row, colDelta, rowDelta)
    {
        var hint = [];
        var currentBlockLength = 0;
        for ( ; col < width && row < height; col += colDelta, row += rowDelta)
        {
            if (image[row * width + col])
            {
                currentBlockLength++;
            }
            else
            {
                if (currentBlockLength > 0)
                    hint.push(currentBlockLength);
                currentBlockLength = 0;
            }
        }
        if (currentBlockLength > 0)
            hint.push(currentBlockLength);
        return hint;
    }


    ///
    /// View functions
    ///

    $scope.getStyleForImage = function (row, col)
    {
        return $scope.picross.image[row * $scope.picross.width + col] ? 'field-ticked' : 'field-unticked';
    }

    $scope.getPicrossTableCornerStyle = function (row, col)
    {
        var isBottom = (row == topHeaderSize-1), isRight = (col == leftHeaderSize-1);
        if (isBottom && isRight) return 'corner-bottom-piece corner-right-piece';
        else if (isBottom) return 'corner-bottom-piece';
        else if (isRight) return 'corner-right-piece';
        else return 'corner-empty-piece';
    }

    $scope.getPicrossTableTopHeaderStyle = function (row, col)
    {
        var classes = '';
        var emptyCell = (topHeaderIndexToColumnHintIndex(col, row) == null);
        if (col > 0 && col % 5 == 0) classes += 'col-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'top-header-cell ';
        if (row == topHeaderSize-1) classes += 'top-header-bottom-cell ';

        return classes;
    }

    $scope.getPicrossTableLeftHeaderStyle = function (row, col)
    {
        var classes = '';
        var emptyCell = (leftHeaderIndexToRowHintIndex(row, col) == null);
        if (row > 0 && row % 5 == 0) classes += 'row-separator ';
        if (emptyCell) classes += 'empty-header-cell ';
        else classes += 'left-header-cell ';
        if (col == leftHeaderSize-1) classes += 'left-header-right-cell ';

        return classes;
    }


    $scope.getPicrossTableCellStyle = function (row, col)
    {
        var classes = '';

        if (row > 0 && (row % 5) == 0) classes += 'row-separator ';
        if (col > 0 && (col % 5) == 0) classes += 'col-separator ';

        return classes;
    }


    ///
    /// Input handling
    ///

    $scope.tableCellMouseDown = function (event, row, col)
    {
        event = event || window.event;

    }
    $scope.tableCellMouseUp = function (event, row, col)
    {
        event = event || window.event;

    }



    ///
    /// Picross object
    ///

    function Picross(width, height, image) {
        this.width = width;
        this.height = height;
        this.image = image; // Source image
        // The numbers of consecutive ticked boxes in the rows/columns.
        this.columnHints = rangeArray(0, width).map(
            function (col) {return columnHintFromImage(image, width, height, col);});
        this.rowHints = rangeArray(0, height).map(
            function (row) {return rowHintFromImage(image, width, height, row);});
        // Playing field
        this.field = createArray(width * height, Unticked);
    }
    Picross.prototype.getField = function (row,col) {
        if (row < 0 || row >= height || col < 0 || col >= width)
            throw "row/col out of range";

        return this.field[row * width + col];
    }
    Picross.prototype.setField = function (row,col,val) {
        if (row < 0 || row >= height || col < 0 || col >= width)
            throw "row/col out of range";

        this.field[row * width + col] = val;
        return this;
    }



    ///
    /// HELPER FUNCTIONS
    ///

    // Generates random number (using Math.random) in the range [min, max].
    function randomInt(min, max)
    {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    // Generates a list [min, max) of max-min elements.
    function rangeArray(min, max)
    {
        return Array.apply(null, Array(max-min)).map(function (_,i) {return min+i;});
    }

    // Create an array of size filled with val
    function createArray(size, val)
    {
        return Array.apply(null, Array(size)).map(function () {return val;});
    }

}]);