from pyspatiotemporalgeom import region as region_logic
import copy


def process_polygons(data):
    """
    We now need to structure a data set that pyspatiotemporalgeom can parse.
    This is done by interacting through the coordinates and creating a 2D list.
    Where this list is the coordinates (x, y) of a line. This list is appended
    to another list. This proccess continues util the polygon is complete.
    Argument:
        data, dictionary of JSON data

    Returns:
        an ordered list of half segments with valid labels.
    """
    seg_list = []
    coord_matrix = [[0 for j in range(2)] for i in range(2)]
    for i in range(len(data)):
        coord_matrix[0][0] = data[i].get("lat")
        coord_matrix[0][1] = data[i].get("lng")
        # If not last segment, else complete the shape
        if len(data) > i + 1:
            coord_matrix[1][0] = data[i + 1].get("lat")
            coord_matrix[1][1] = data[i + 1].get("lng")
        else:
            coord_matrix[1][0] = data[0].get("lat")
            coord_matrix[1][1] = data[0].get("lng")
        # Need to make a copy of the list. Else each element in seg_list will
        # be the last coord_matrix data set.
        seg_list.append(copy.deepcopy(coord_matrix))
    return region_logic.createRegionFromSegs(seg_list)


def process_intersections(regions):
    """
    Iterates through the given regions. If there is an intersection
    between those two regions. That intersection is then used as the next
    region to be used to compare aganist the next region in the list. If there
    is no intersection then there is no common intersection and it is done.

    Arguments:
        regions: a list of regions shown on the map

    Returns:
        An intersection in region form.
    """
    # This will be used to start the process
    region = regions[0].get("region")
    print region
    # Compare with the rest of the regions
    for other_region in regions[1:]:
        region = region_logic.intersection(region, other_region.get("region"))
        # If region is not empty, then there was an intersection.
        if not region:
            return []
    return region


def process_unions(regions):
    """
    Iterates through the given regions. That union is then used as the next
    region to be used to union the next region in the list. If there
    is no union then the process is done, the region should be empty.

    Arguments:
        regions: a list of regions shown on the map

    Returns:
        A region unioned with all given regions.
    """
    # This will be used to start the process
    region = regions[0].get("region")
    # Compare with the rest of the regions
    for other_region in regions[1:]:
        region = region_logic.union(region, other_region.get("region"))
        # If region is not empty, then there was a well-formed union.
        if not region:
            return []
    return region


def process_difference(regions):
    """
    Iterates through the given regions. That difference is then used as the
    next region to be used to difference the next region in the list. If there
    is no difference then the process is done, the region should be empty.

    Arguments:
        regions: a list of regions shown on the map

    Returns:
        A region formed from the difference with all given regions.
    """
    region = regions[0].get("region")
    # Compare with the rest of the regions
    for other_region in regions[1:]:
        region = region_logic.difference(region, other_region.get("region"))
        # If region is not empty, then there was a well-formed difference.
        if not region:
            return []
    return region


def hseg_to_coords(hseg):
    """
    Iterates through the hsegs to find the cycles and returns the the
    coordinates of each cycle in its own dictionary. The key is the unique
    label given to the hseg and the value is the coordinates.

    Returns:
        A list of dictionary of coordinates.
    """
    cycle_dict = {}
    # Sets up the cycle_dict to have dictionary for each cycle and its segments
    for seg in hseg:
        key = seg[1]
        # -1 is not a unique label for segment
        if key == -1:
            key = seg[2]
        if key not in cycle_dict:
            cycle_dict[key] = {}
        # The starting point of the hseg will be the key for its line segments.
        if seg[0][0] not in cycle_dict[key]:
            cycle_dict[key][seg[0][0]] = []
        # They key has a line segment to this coordinate.
        cycle_dict[key][seg[0][0]].append(seg[0][1])
    seg_dict = {}
    # For each cyle in the dictionary we will find its cycle path.
    for cycle_label in cycle_dict:
        curr_cord = None
        next_cord = None
        visited_cords = []
        for cord in cycle_dict[cycle_label]:
            # Checks to see if it is the first itteration of the loop.
            if curr_cord is None:
                next_cord = cord
                curr_cord = cord
            else:
                next_cord = cycle_dict[cycle_label][curr_cord][0]
            # If we already discovered this line segment then it will be in
            # visited_cords.
            if next_cord in visited_cords:
                next_cord = cycle_dict[cycle_label][curr_cord][1]
            visited_cords.append(next_cord)
            curr_cord = next_cord
        seg_dict[cycle_label] = []
        # After finding the path for the cycle we just need to put in
        # lat and lng for google maps to understand.
        for point in visited_cords:
            seg_dict[cycle_label].append({"lat": point[0], "lng": point[1]})
    return seg_dict
