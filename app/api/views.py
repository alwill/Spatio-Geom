from flask import request
from . import api
from ..spatio_helper import create_segments
import json


@api.route("/process_coords", methods=["POST"])
def process_coords():
    """
    Retrieves a JSON as as stirng. this string is converted back into a JSON
    object (dictionary). Returns result of create_segments()

    Returns: This returns a post request of create_segments().
    """

    data = json.loads(request.form.get("coords")).get("b")
    return "{}".format(create_segments(data))