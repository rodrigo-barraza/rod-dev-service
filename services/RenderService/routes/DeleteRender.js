'use strict';
const EventsEventEmitter = require('events').EventEmitter;
const ResponseClass = require.main.require('./classes/ResponseClass');
const RequestClass = require.main.require('./classes/RequestClass');
const RenderController = require.main.require('./controllers/RenderController');
const LikeController = require.main.require('./controllers/LikeController');

const DeleteRender = () => {
    return (req, res) => {
        const EventEmitter = new EventsEventEmitter();
        const response = new ResponseClass(res);
        const request = new RequestClass(req);
        const headers = {
            ip: request.headers('x-forwarded-for') || request.connection('remoteAddress'),
            session: request.headers('session'),
            local: request.headers('local'),
        };

        const body = {
            id: request.body('id'),
        }

        function verifyParameters() {
            const hasRequiredParameters = headers.ip && body.id;
            if (hasRequiredParameters) {
                EventEmitter.emit('deleteRender');
            } else {
                return response.sendError('Missing required parameters.');
            }
        }

        async function deleteRender() {
            try {
                let deleteRender = await RenderController.deleteRender(body.id, headers.ip)
                if (deleteRender.error) {
                    return response.sendError(deleteRender.error.message)
                }
                if (deleteRender.data.id) {
                    await LikeController.deleteLike(body.id, headers.ip)
                    return response.sendSuccessMessage('Deleted')
                }
            } catch (err) {
                console.log(err)
            }
        }

        EventEmitter.on('verify-parameters', verifyParameters);
        EventEmitter.on('deleteRender', deleteRender);
        EventEmitter.emit('verify-parameters');
    }
};

module.exports = DeleteRender;