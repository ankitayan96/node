const User = require('../schema/user.schema');
const Post = require('../schema/post.schema');

module.exports.getUsersWithPostCount = async (req, res) => {

  try {
    let pageNo = parseInt(req.query.page) ?? null;
    let size = parseInt(req.query.limit) ?? null;
    let skipObject = { "$skip": 0 };
    let limitObject = { "$limit": 0 };
    let paginationMetaData = {
      "totalDocs": null,
      "limit": null,
      "page": null,
      "totalPages": null,
      "pagingCounter": null,
      "hasPrevPage": false,
      "hasNextPage": false,
      "prevPage": null,
      "nextPage": null
    }
    let isQueryProvided = false;
    if (pageNo < 0 || pageNo === 0 || size < 0 || size === 0) {
      pageNo = null;
      size = null
    }

    if (pageNo && size) {
      skipObject["$skip"] = size * (pageNo - 1);
      limitObject["$limit"] = size;
      isQueryProvided = true;
    }

    // To count Total no of documents in the DB
    User.countDocuments({}, function (err, totalCount) {
      if (err) {
        response = {
          "error": true,
          "message": "Error fetching data"
        }
        return res.status(400).send(response);
      }
      User.aggregate([
        {
          $lookup: {
            from: Post.collection.collectionName,
            localField: "_id",
            foreignField: "userId",
            as: "posts"
          }
        },
        {
          $project: {
            posts: { $size: "$posts" },
            name: 1
          }
        },
        skipObject,
        { "$limit": limitObject["$limit"] > 0 ? limitObject["$limit"] : totalCount }
      ], {}, function (err, data) {

        if (err) {
          response = {
            "error": true,
            "message": "Error fetching data"
          };
          return res.status(400).send(response);

        } else {
          var totalPages = size && totalCount ? Math.ceil(totalCount / size) : 1;

          if (!isQueryProvided) {
            var response = {
              "data": {
                "users": data,
                "pagination": {
                  ...paginationMetaData,
                  "totalDocs": totalCount ?? null,
                  "limit": totalCount ?? null,
                  "page": 1,
                  "totalPages": totalPages,
                  "pagingCounter": 1
                }
              }
            };
          }

          else {
            pageNo = Math.ceil((skipObject["$skip"] + 1) / size);
            if (pageNo > 1) {
              paginationMetaData["hasPrevPage"] = true;
              paginationMetaData["prevPage"] = pageNo - 1;

            } else if (pageNo == 1 && typeof skipObject["$skip"] !== 'undefined' && skipObject["$skip"] !== 0) {
              paginationMetaData["hasPrevPage"] = true;
              paginationMetaData["prevPage"] = 1;
            }

            // Set next page
            if (pageNo < totalPages) {
              paginationMetaData["hasNextPage"] = true;
              paginationMetaData["nextPage"] = pageNo + 1;
            }
            var response = {
              "data": {
                "users": data,
                "pagination": {
                  ...paginationMetaData,
                  "totalDocs": totalCount ?? null,
                  "limit": size,
                  "page": pageNo,
                  "totalPages": totalPages,
                  "pagingCounter": (pageNo - 1) * size + 1,
                }
              }
            };
          }
        }
        return res.status(200).json(response);
      });
    })
  } catch (error) {
    res.send({ error: error.message });
  }
}