from flask import request
from . import api
from ..utils import create_segments
import json
import copy


@api.route("/process_coords", methods=["POST"])
def process_coords():
    """
    Retrives a JSON as a string. This string is converted back into a JSON
    object (dictionary). We now need to structure a data set that
    pyspatiotemporalgeom can parse. This is done by interating through the
    coordinates and creating a 2D list. Where this list is the coordinates
    (x, y) of a line. This list is appended to another list. This proccess
    continues util the polygon is complete.

    Returns:
        a dictionary(JSON) of the region created by seg_list
    """
    data = json.loads(request.form.get("coords")).get("b")
    seg_list = []
    coord_matrix = [[0 for j in range(2)] for i in range(2)]
    for i in range(len(data)):
        coord_matrix[0][0] = data[i].get("lat")
        coord_matrix[0][1] = data[i].get("lng")
        if len(data) > i + 1:
            coord_matrix[1][0] = data[i + 1].get("lat")
            coord_matrix[1][1] = data[i + 1].get("lng")
        else:
            coord_matrix[1][0] = data[0].get("lat")
            coord_matrix[1][1] = data[0].get("lng")
        # Need to make a copy of the list. Else each element in seg_list will
        # be the last coord_matrix data set.
        seg_list.append(copy.deepcopy(coord_matrix))
    return "{}".format(create_segments(seg_list))
