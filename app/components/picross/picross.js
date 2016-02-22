'use strict';

angular.module('picross')
.factory('picrossFactory', PicrossFactoryService);

function PicrossFactoryService()
{
    return {create: create};

    function create(width, height, image)
    {
        return new Picross(width, height, image);
    }
}

///
/// Picross object
///

function Picross(width, height, image) {
    // Playing field values (consider constant)
    this.Unticked = 0;
    this.Ticked = 1;
    this.Crossed = 2;

    this.width = width;
    this.height = height;
    this.image = image; // Source image
    // The numbers of consecutive ticked boxes in the rows/columns.
    this.columnHints = rangeArray(0, width).map(
        function (col) {return columnHintFromImage(image, width, height, col);});
    this.rowHints = rangeArray(0, height).map(
        function (row) {return rowHintFromImage(image, width, height, row);});
    // Playing field
    this.field = createArray(width * height, this.Unticked);

    // Methods
    this.isFinished = isFinished;



    // Returns true if the Picross is finished (all fields match with image)
    function isFinished()
    {
        return this.field.every(function (fieldValue, index) {
            var imageEqvValue = fieldValue == this.Crossed ? this.Unticked : fieldValue;
            return !!imageEqvValue == !!this.image[index];
        }, this);
    }


    ///
    /// Private helpers
    ///

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

