class Response {

    success(code, message, data) {
        return this.response(true, code, message, data)
    }

    failed(code, message, data) {
        return this.response(false, code, message, data)
    }

    response(success, code, message, data) {
        return {
            success: success,
            code: code,
            message: message,
            data: data
        }
    }
}

module.exports = new Response();