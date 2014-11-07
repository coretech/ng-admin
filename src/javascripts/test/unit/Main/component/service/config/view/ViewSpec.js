/*global require,describe,module,beforeEach,inject,it,expect*/

define(function (require) {
    'use strict';

    var View = require('ng-admin/Main/component/service/config/view/View'),
        Action = require('ng-admin/Main/component/service/config/Action'),
        Field = require('ng-admin/Main/component/service/config/Field'),
        Entity = require('ng-admin/Main/component/service/config/Entity'),
        ReferenceMany = require('ng-admin/Main/component/service/config/ReferenceMany'),
        Reference = require('ng-admin/Main/component/service/config/Reference');

    describe("Service: View config", function () {

        it('should returns it\'s name.', function () {
            var view = new View('view-abx');

            expect(view.name()).toEqual('view-abx');
        });

        it('should returns a title and description from a function.', function () {
            var view = new View();
            view.title(function () {
                return 'my-title';
            });
            view.description(function () {
                return 'my desc';
            });

            expect(view.getTitle()).toEqual('my-title');
            expect(view.getDescription()).toEqual('my desc');
        });

        it('should add a return field types.', function () {
            var view = new View();
            var refMany = new ReferenceMany('refMany');
            var ref = new Reference('myRef');

            var field = new Field('body');

            view.addField(ref).addField(refMany).addField(field);

            expect(view.getFieldsOfType('ReferenceMany')['refMany'].name()).toEqual('refMany');
            expect(view.getReferences()['refMany'].name()).toEqual('refMany');
            expect(view.getReferences()['myRef'].name()).toEqual('myRef');
            expect(view.getFields()['body'].order()).toEqual(2);
        });

        it('should add actions.', function () {
            var view = new View();
            var action = new Action('doSomething');
            view.addAction(action);

            expect(view.getActions()['doSomething'].order()).toEqual(0);
        });

        it('should returns the identifier.', function () {
            var view = new View(),
                entity = new Entity(),
                field1 = new Field('post_id').identifier(true),
                field2 = new Field('name').identifier(false);

            view.addField(field1).addField(field2);
            entity.addView(view);

            expect(view.identifier().name()).toEqual('post_id');
        });

        it('should map some raw entities', function () {
            var view = new View(),
                entity = new Entity(),
                field1 = new Field('post_id').identifier(true),
                field2 = new Field('title');

            entity.addView(view);

            view
                .addField(field1)
                .addField(field2);

            var entries = view.mapEntries([
                { post_id: 1, title: 'Hello', published: true},
                { post_id: 2, title: 'World', published: false},
                { post_id: 3, title: 'How to use ng-admin', published: false}
            ]);

            expect(entries.length).toEqual(3);
            expect(entries[0].identifierValue).toEqual(1);
            expect(entries[1].values.title).toEqual('World');
            expect(entries[1].values.published).toEqual(null);
        });

        it('should map some one entity when the identifier in not in the view', function () {
            var view = new View(),
                field = new Field('title'),
                entity = new Entity('posts');

            view
                .addField(field);

            entity
                .identifier(new Field('post_id'))
                .addView(view);

            var entry = view.mapEntry({ post_id: 1, title: 'Hello', published: true});
            expect(entry.identifierValue).toEqual(1);
            expect(entry.values.title).toEqual('Hello');
        });

    });
});
