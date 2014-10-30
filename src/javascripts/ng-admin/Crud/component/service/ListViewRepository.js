/*global define*/

define(function (require) {
    'use strict';

    var angular = require('angular'),
        utils = require('ng-admin/lib/utils'),
        ViewRepository = require('ng-admin/Crud/component/service/ViewRepository');

    /**
     * @constructor
     */
    function ListViewRepository() {
        ViewRepository.apply(this, arguments);
    }

    /**
     * Return the list of all object of entityName type
     * Get all the object from the API
     *
     * @param {ListView} view                the view associated to the entity
     * @param {Number}   page                the page number
     * @param {Boolean}  fillSimpleReference should we fill Reference list
     * @param {String}   query               searchQuery to filter elements
     * @param {String}   sortField           the field to be sorted ex: entity.fieldName
     * @param {String}   sortDir             the direction of the sort
     * @param {Object}   filters             filter specific fields
     *
     * @returns {promise} the entity config & the list of objects
     */
    ListViewRepository.prototype.getAll = function (view, page, fillSimpleReference, query, sortField, sortDir, filters) {
        var rawEntries,
            entries,
            referencedValues,
            self = this;

        page = page || 1;
        fillSimpleReference = typeof (fillSimpleReference) === 'undefined' ? true : fillSimpleReference;

        return this.getRawValues(view, page, query, sortField, sortDir, filters)
            .then(function (values) {
                rawEntries = values;

                return self.getReferencedValues(view);
            }).then(function (refValues) {
                referencedValues = refValues;

                entries = view.mapEntities(rawEntries);
                entries = self.fillReferencesValuesFromCollection(entries, referencedValues, fillSimpleReference);
                entries = view.truncateListValue(entries);

                return {
                    view: view,
                    entries: entries,
                    currentPage: page,
                    perPage: view.perPage(),
                    totalItems: view.totalItems()(rawEntries)
                };
            });
    };

    /**
     * Return the list of all object of entityName type
     * Get all the object from the API
     *
     * @param {View}   view      the view associated to the entity
     * @param {Number} page      the page number
     * @param {String} query     searchQuery to filter elements
     * @param {String} sortField the field to be sorted ex: entity.fieldName
     * @param {String} sortDir   the direction of the sort
     * @param {Object} filters   filter specific fields
     *
     * @returns {promise} the entity config & the list of objects
     */
    ListViewRepository.prototype.getRawValues = function (view, page, query, sortField, sortDir, filters) {
        var entityName = view.getEntity().name();

        page = (typeof (page) === 'undefined') ? 1 : parseInt(page, 10);
        filters = (typeof (filters) === 'undefined') ? {} : filters;

        var entityConfig = view.getEntity(),
            interceptor = view.interceptor(),
            sortEntity = sortField ? sortField.split('.')[0] : '',
            sortParams = sortEntity === entityName ? entityConfig.getSortParams(sortField.split('.').pop(), sortDir) : null,
            params = view.getAllParams(page, sortParams, query),
            headers = view.getAllHeaders(sortParams);

        filters = entityConfig.filterParams()(filters);

        // Add filters
        angular.forEach(filters, function(value, fieldName) {
            params[fieldName] = value;
        });

        if (interceptor) {
            this.Restangular.addResponseInterceptor(interceptor);
        }

        // Get grid data
        return this.Restangular
            .all(entityConfig.name())
            .getList(params, headers);
    };

    /**
     * Returns all References for an entity with associated values [{targetEntity.identifier: targetLabel}, ...]
     *
     * @param {View} view
     *
     * @returns {promise}
     */
    ListViewRepository.prototype.getReferencedValues = function (view) {
        var self = this,
            references = view.getReferences(),
            calls = [];

        angular.forEach(references, function (reference) {
            calls.push(self.getRawValues(reference.getView(), 1, false));
        });

        return this.$q.all(calls)
            .then(function (responses) {
                var i = 0;
                angular.forEach(references, function (reference, index) {
                    references[index].setEntries(responses[i++]);
                });

                return references;
            });
    };

    /**
     * Returns all ReferencedList for an entity for associated values [{targetEntity.identifier: [targetFields, ...]}}
     *
     * @param {View}   view
     * @param {String} sortField
     * @param {String} sortDir
     *
     * @returns {promise}
     */
    ListViewRepository.prototype.getReferencedListValues = function (view, sortField, sortDir) {
        var self = this,
            referenceLists = view.getReferencedLists(),
            entityId = view.getIdentifier().value,
            calls = [];

        angular.forEach(referenceLists, function (referenceList) {
            calls.push(self.getRawValues(referenceList.getView(), 1, false, false, null, sortField, sortDir));
        });

        return this.$q.all(calls)
            .then(function (responses) {
                var i = 0;

                angular.forEach(referenceLists, function (referencedList) {
                    referencedList
                        .setEntries(responses[i++])
                        .filterEntries(entityId);
                });

                return referenceLists;
            });
    };

    /**
     * Fill ReferencedMany & Reference values from a collection a values
     *
     * @param {[View]}  collection
     * @param {Object}  referencedValues
     * @param {Boolean} fillSimpleReference
     * @returns {Array}
     */
    ListViewRepository.prototype.fillReferencesValuesFromCollection = function (collection, referencedValues, fillSimpleReference) {
        fillSimpleReference = typeof (fillSimpleReference) === 'undefined' ? false : fillSimpleReference;

        var choices,
            entry,
            i,
            j,
            l,
            id,
            identifier;

        angular.forEach(referencedValues, function (reference, referenceField) {
            choices = reference.getChoices();

            for (i = 0, l = collection.length; i < l; i++) {
                entry = collection[i];
                identifier = reference.valueTransformer()(entry.getField(referenceField).value);

                if (reference.constructor.name === 'ReferenceMany') {
                    entry.getField(referenceField).value = [];

                    for (j in identifier) {
                        id = identifier[j];
                        entry.getField(referenceField).value.push(choices[id]);
                    }
                } else if (fillSimpleReference && identifier && identifier in choices) {
                    entry.getField(referenceField).referencedValue = reference.getTruncatedListValue(choices[identifier]);
                }
            }
        });

        return collection;
    };

    return ListViewRepository;
});