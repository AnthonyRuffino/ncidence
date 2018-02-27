class Hello{
	constructor(val){
		this.val = 'Hello ' + val;
		this.id = 999;
		
		if(val === 'fail') {
			throw 'Hello failure';
		}
	}
}


const common = {
    Hello: Hello
}